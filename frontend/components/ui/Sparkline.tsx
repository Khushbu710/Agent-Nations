"use client";
interface Props {
  values: number[];
  color:  string;
  width?: number;
  height?: number;
}

export function Sparkline({ values, color, width = 60, height = 20 }: Props) {
  if (values.length < 2) {
    return <div style={{ width, height }} />;
  }

  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const last = pts[pts.length - 1]!.split(",");
  const lastX = parseFloat(last[0] ?? "0");
  const lastY = parseFloat(last[1] ?? "0");

  // Filled area path
  const areaPath =
    `M0,${height} ` +
    pts.map((p) => `L${p}`).join(" ") +
    ` L${width},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
         style={{ overflow: "visible" }}>
      {/* Fill */}
      <path d={areaPath} fill={color} fillOpacity={0.08} />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color}
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                opacity={0.8} />
      {/* Latest value dot */}
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  );
}