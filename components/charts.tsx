"use client";
import { useState } from "react";
import { shortDur } from "@/lib/format";

/** Time-spent-per-page bars; the max bar is highlighted in brand blue. */
export function PageBars({ values, height = 140, compact = false }: { values: number[]; height?: number; compact?: boolean }) {
  const max = Math.max(1, ...values);
  const maxIdx = values.indexOf(Math.max(...values));
  return (
    <div style={{ display: "flex", gap: compact ? 6 : 10, alignItems: "flex-end" }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
          <div className="micro faint" style={{ fontSize: 10 }}>{shortDur(v)}</div>
          <div title={`Page ${i + 1}: ${shortDur(v)}`} style={{ width: "100%", height: Math.max(6, (v / max) * height), borderRadius: 4, background: i === maxIdx && v > 0 ? "var(--dz-bg-brand)" : "var(--dz-bg-brand-subtle)", border: i === maxIdx && v > 0 ? "1px solid var(--dz-bg-brand)" : "1px solid #c9dafb" }} />
          {!compact && (
            <div style={{ width: "100%", maxWidth: 44, height: 30, border: "1px solid var(--dz-border-default)", borderRadius: 4, padding: "5px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ height: 2, width: "60%", background: "#111827", borderRadius: 2 }} />
              {[0, 1, 2].map((k) => <span key={k} style={{ height: 1.5, width: "90%", background: "#cfccc7", borderRadius: 2 }} />)}
            </div>
          )}
          <div className="micro faint" style={{ fontSize: 10 }}>{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

/** Area/line chart for daily counts. */
export function LineChart({ points, labels, height = 200 }: { points: number[]; labels: string[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000, H = height, padL = 32, padB = 26, padT = 10;
  const max = Math.max(4, ...points);
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => padL + (i * (W - padL - 10)) / Math.max(1, points.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const area = `${d} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const tickEvery = Math.max(1, Math.round(points.length / 5));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: "visible" }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.round(((px - padL) / (W - padL - 10)) * (points.length - 1));
        setHover(Math.max(0, Math.min(points.length - 1, i)));
      }}>
      <defs>
        <linearGradient id="lcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4D94F7" stopOpacity=".22" /><stop offset="1" stopColor="#4D94F7" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line x1={padL} x2={W} y1={y(k * step)} y2={y(k * step)} stroke="#f2f4f7" vectorEffect="non-scaling-stroke" />
          <text x={0} y={y(k * step) + 4} fontSize="11" fill="#6b7280">{k * step}</text>
        </g>
      ))}
      <path d={area} fill="url(#lcg)" />
      <path d={d} fill="none" stroke="#4D94F7" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {labels.map((l, i) => (i % tickEvery === 0 || i === labels.length - 1) && (
        <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="#6b7280" textAnchor="middle">{l}</text>
      ))}
      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} stroke="#9ca3af" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <circle cx={x(hover)} cy={y(points[hover])} r="4" fill="#4D94F7" />
          <text x={Math.min(W - 80, x(hover) + 8)} y={Math.max(20, y(points[hover]) - 8)} fontSize="12" fill="#111827" fontWeight="600">
            {labels[hover]} · {points[hover]} visit{points[hover] === 1 ? "" : "s"}
          </text>
        </g>
      )}
      {hover === null && points.length > 0 && <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="3.5" fill="#4D94F7" />}
    </svg>
  );
}

export function dailySeries(dates: string[], days: number) {
  const out: number[] = Array(days).fill(0);
  const labels: string[] = [];
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  for (const iso of dates) {
    const idx = Math.floor((new Date(iso).getTime() - start.getTime()) / 86400000);
    if (idx >= 0 && idx < days) out[idx]++;
  }
  return { points: out, labels };
}
