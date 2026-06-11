// =============================================================================
// src/services/GrokClient.ts
// =============================================================================
// Underlying provider: Groq  (filename, class, and all exports unchanged).
//
// Groq exposes an OpenAI-compatible REST API at https://api.groq.com/openai/v1
// so we reuse the existing `openai` npm package — no new dependency needed.
//
// Public interface is IDENTICAL to every previous version of this file:
//   - GrokClient class with .complete(request) → CompletionResponse
//   - GrokApiError / GrokTimeoutError error classes
//   - CompletionRequest / CompletionResponse interfaces
//   - getGrokClient() singleton factory
//
// Zero changes required in agents, schemas, prompts, or blockchain files.
//
// Why Groq over Gemini free tier:
//   - qwen/qwen3-32b: 6,000 TPM, 500 RPM on free tier — no serial queuing needed
//   - OpenAI-compatible → trivial swap via baseURL
//   - Fast inference (Groq's LPU hardware)
//   - Reliable JSON output with explicit response_format
//
// All fixes from the Gemini implementation are preserved:
//   - extractJson()        — brace-counting JSON extractor (handles prose/fences)
//   - Serial queue         — opt-in via GROQ_REQUEST_GAP_MS (default 0 = disabled)
//   - Retry logic          — 2 attempts, exponential backoff, retryable status set
//   - JSON repair          — truncation guard, code-fence stripping
// =============================================================================

import OpenAI from "openai";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface GrokClientConfig {
  /** Groq API key — from GROQ_API_KEY env var. */
  apiKey: string;
  /** Model identifier. Default: qwen/qwen3-32b */
  model: string;
  /** Maximum tokens per response. 1024 prevents truncation on long reasoning. */
  maxTokens: number;
  /** Sampling temperature. */
  temperature: number;
}

function loadConfig(): GrokClientConfig {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "GROQ_API_KEY is not set. " +
      "Get a free key at https://console.groq.com and add it to .env.",
    );
  }
  return {
    apiKey,
    model:       process.env["GROQ_MODEL"]        ?? "qwen/qwen3-32b",
    maxTokens:   parseInt(process.env["GROQ_MAX_TOKENS"]  ?? "1024", 10),
    temperature: parseFloat(process.env["GROQ_TEMPERATURE"] ?? "0.7"),
  };
}

// -----------------------------------------------------------------------------
// Error types  — names unchanged; agents catch these by class name
// -----------------------------------------------------------------------------

export class GrokApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly attempt?: number,
  ) {
    super(message);
    this.name = "GrokApiError";
  }
}

export class GrokTimeoutError extends Error {
  constructor(public readonly attempt: number) {
    super(`Groq API request timed out on attempt ${attempt}.`);
    this.name = "GrokTimeoutError";
  }
}

// -----------------------------------------------------------------------------
// Completion request/response shapes  — unchanged public contract
// -----------------------------------------------------------------------------

export interface CompletionRequest {
  system: string;
  user: string;
  /** Optional label for structured logging (e.g. "TechNation/Economist"). */
  label?: string;
}

export interface CompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

// -----------------------------------------------------------------------------
// JSON extraction — handles prose wrappers, markdown fences, think-blocks
// -----------------------------------------------------------------------------

/**
 * Extracts the first complete JSON object from a raw LLM response.
 *
 * Handles:
 *   1. Markdown code fences:  ```json { ... } ```
 *   2. Prose prefix/suffix:   "Here is my response: { ... } Done."
 *   3. Qwen3 <think> blocks:  <think>...</think>\n{ ... }
 *   4. Truncated output:      returns partial fragment so JSON.parse
 *                             fails naturally and the schema fallback fires.
 */
function extractJson(raw: string): string {
  // Step 1 — strip Qwen3 chain-of-thought think blocks (appear before JSON)
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Step 2 — strip markdown code fences
  text = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Step 3 — find first opening brace
  const start = text.indexOf("{");
  if (start === -1) return text;

  // Step 4 — brace-count walk to find matching close
  let depth    = 0;
  let inString = false;
  let escape   = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (escape)                       { escape = false;      continue; }
    if (ch === "\\" && inString)      { escape = true;       continue; }
    if (ch === '"')                   { inString = !inString; continue; }
    if (inString)                                             continue;
    if (ch === "{")                   depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  // Truncated — return from opening brace; caller's JSON.parse will fail
  // cleanly and the agent fallback will trigger.
  return text.slice(start);
}

// -----------------------------------------------------------------------------
// Retry helpers
// -----------------------------------------------------------------------------

const MAX_ATTEMPTS         = 2;
const RETRY_BASE_DELAY_MS  = 1_500;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryableError(err: unknown): boolean {
  if (err instanceof GrokApiError && err.statusCode !== undefined) {
    return RETRYABLE_STATUS_CODES.has(err.statusCode);
  }
  if (err instanceof GrokTimeoutError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("econnreset")  ||
      msg.includes("etimedout")   ||
      msg.includes("network")     ||
      msg.includes("socket")      ||
      msg.includes("rate")        ||
      msg.includes("quota")
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Optional serial queue
// -----------------------------------------------------------------------------

/**
 * Minimum ms between consecutive API calls.
 * Default 0 = no queuing (Groq free tier: 500 RPM — parallel calls are fine).
 * Set GROQ_REQUEST_GAP_MS > 0 to serialise if you hit rate limits.
 */
const MIN_REQUEST_GAP_MS = parseInt(
  process.env["GROQ_REQUEST_GAP_MS"] ?? "0",
  10,
);

// -----------------------------------------------------------------------------
// GrokClient — public name preserved, Groq under the hood
// -----------------------------------------------------------------------------

export class GrokClient {
  private readonly client: OpenAI;
  private readonly config: GrokClientConfig;

  // Serial queue — only active when MIN_REQUEST_GAP_MS > 0
  private queue: Promise<void> = Promise.resolve();
  private lastRequestEndMs     = 0;

  constructor(config?: Partial<GrokClientConfig>) {
    const loaded  = loadConfig();
    this.config   = { ...loaded, ...config };
    this.client   = new OpenAI({
      apiKey:  this.config.apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  /**
   * Sends a system + user message pair to Groq and returns the raw text.
   *
   * When GROQ_REQUEST_GAP_MS > 0, calls are serialised through an internal
   * queue with that gap enforced between completions.
   * Otherwise calls are fully concurrent (the Groq default).
   *
   * Retries once on transient / rate-limit errors with exponential backoff.
   * Throws GrokApiError on unrecoverable failure.
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (MIN_REQUEST_GAP_MS <= 0) {
      // Fast path — no queuing, fully concurrent
      return this._callGroq(request);
    }

    // Queued path — serialise with gap enforcement
    let resolve!: (r: CompletionResponse) => void;
    let reject!:  (e: unknown)            => void;
    const outer = new Promise<CompletionResponse>((res, rej) => {
      resolve = res;
      reject  = rej;
    });

    this.queue = this.queue.then(async () => {
      const elapsed = Date.now() - this.lastRequestEndMs;
      const gap     = MIN_REQUEST_GAP_MS - elapsed;
      if (gap > 0 && this.lastRequestEndMs > 0) {
        console.log(
          `[GrokClient] [${request.label ?? "unknown"}] ` +
          `Rate-limit gap: waiting ${gap}ms...`,
        );
        await sleep(gap);
      }
      try {
        resolve(await this._callGroq(request));
      } catch (err) {
        reject(err);
      } finally {
        this.lastRequestEndMs = Date.now();
      }
    });

    return outer;
  }

  private async _callGroq(request: CompletionRequest): Promise<CompletionResponse> {
    const label = request.label ?? "unknown";
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const start = Date.now();

      try {
        if (attempt > 1) {
          const delay = RETRY_BASE_DELAY_MS * attempt;
          console.log(
            `[GrokClient] [${label}] Retry attempt ${attempt} after ${delay}ms...`,
          );
          await sleep(delay);
        }

        const response = await this.client.chat.completions.create({
          model:       this.config.model,
          max_tokens:  this.config.maxTokens,
          temperature: this.config.temperature,
          // Groq honours response_format for JSON-capable models
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: request.system },
            { role: "user",   content: request.user   },
          ],
        });

        const latencyMs = Date.now() - start;
        const choice    = response.choices[0];

        if (!choice) {
          throw new GrokApiError(`Groq returned empty choices for ${label}.`);
        }

        const rawContent = choice.message.content;
        if (!rawContent || rawContent.trim() === "") {
          throw new GrokApiError(`Groq returned empty content for ${label}.`);
        }

        // extractJson handles any residual think-blocks or prose wrappers
        const content = extractJson(rawContent);

        const promptTokens     = response.usage?.prompt_tokens     ?? 0;
        const completionTokens = response.usage?.completion_tokens ?? 0;

        console.log(
          `[GrokClient] [${label}] OK — ` +
          `${promptTokens}p + ${completionTokens}c tokens, ${latencyMs}ms`,
        );

        return { content, promptTokens, completionTokens, latencyMs };

      } catch (err: unknown) {
        lastError       = err;
        const latencyMs = Date.now() - start;

        if (err instanceof OpenAI.APIError) {
          const wrapped = new GrokApiError(
            `Groq API error (${err.status}): ${err.message}`,
            err.status,
            attempt,
          );
          lastError = wrapped;
          console.warn(
            `[GrokClient] [${label}] API error on attempt ${attempt}: ` +
            `HTTP ${err.status} — ${err.message} (${latencyMs}ms)`,
          );
          if (!isRetryableError(wrapped) || attempt === MAX_ATTEMPTS) throw wrapped;
          continue;
        }

        console.warn(
          `[GrokClient] [${label}] Unexpected error on attempt ${attempt}: ` +
          `${err instanceof Error ? err.message : String(err)} (${latencyMs}ms)`,
        );
        if (!isRetryableError(err) || attempt === MAX_ATTEMPTS) throw err;
      }
    }

    throw lastError ?? new GrokApiError("All retry attempts exhausted.");
  }
}

// -----------------------------------------------------------------------------
// Module-level singleton — same exported name, same semantics
// -----------------------------------------------------------------------------

let _instance: GrokClient | null = null;

/**
 * Returns the shared GrokClient singleton (Groq under the hood).
 * Lazily initialised on first call.
 * All agents share this instance so the optional serial queue stays coherent.
 */
export function getGrokClient(): GrokClient {
  if (!_instance) {
    _instance = new GrokClient();
  }
  return _instance;
}