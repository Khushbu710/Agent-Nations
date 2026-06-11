"use client";
interface Props { active?: boolean; color?: string; size?: "sm" | "md"; }
export function PulsingDot({ active = true, color = "#22c55e", size = "sm" }: Props) {
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  if (!active) return <span className={`inline-block ${dim} rounded-full bg-white/15`} />;
  return (
    <span className={`relative inline-flex ${dim}`}>
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60`}
            style={{ backgroundColor: color }} />
      <span className={`relative inline-flex ${dim} rounded-full`}
            style={{ backgroundColor: color }} />
    </span>
  );
}
