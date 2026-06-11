"use client";
import { ACTION_STYLE } from "@/lib/constants";
import type { Action }  from "@/lib/types";

interface Props {
  action: Action;
  size?:  "xs" | "sm" | "md" | "lg";
}

export function ActionBadge({ action, size = "md" }: Props) {
  const s = ACTION_STYLE[action];
  const cls =
    size === "xs" ? "px-1.5 py-0.5 text-[9px] gap-1" :
    size === "sm" ? "px-2 py-1 text-[10px] gap-1.5" :
    size === "lg" ? "px-4 py-2 text-sm gap-2" :
                    "px-3 py-1.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono font-bold tracking-wide ${cls}`}
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.text}22` }}
    >
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}