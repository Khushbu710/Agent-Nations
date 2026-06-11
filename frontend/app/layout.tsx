// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Nations — Autonomous AI Governance on Base",
  description: "Three AI nations deliberate, govern, and evolve on Base Sepolia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        {/* Nav */}
        <nav style={{ borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)", background: "rgba(5,13,26,0.8)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1.5rem" }}
               className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="font-black text-base tracking-tight" style={{ color: "var(--text-primary)" }}>
                ⚡ Agent Nations
              </span>
              <span className="mono text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(56,189,248,0.12)", color: "var(--tech)", border: "1px solid rgba(56,189,248,0.2)" }}>
                BASE SEPOLIA
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                Autonomous AI Governance
              </span>
            </div>
          </div>
        </nav>

        <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}