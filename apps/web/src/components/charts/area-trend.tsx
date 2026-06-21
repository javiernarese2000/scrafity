"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type Point = { dia: string; ingestadas: number; publicadas: number };
type SeriesKey = "ingestadas" | "publicadas";

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "ingestadas", label: "Ingestadas", color: "var(--color-viz-1)" },
  { key: "publicadas", label: "Publicadas", color: "var(--color-viz-2)" },
];

const W = 720;
const H = 240;
const PAD = { t: 16, r: 16, b: 28, l: 32 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

export function AreaTrend({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max =
    Math.max(...data.map((d) => Math.max(d.ingestadas, d.publicadas))) * 1.15;
  const x = (i: number) => PAD.l + (innerW * i) / (data.length - 1);
  const y = (v: number) => PAD.t + innerH - (innerH * v) / max;

  const linePath = (key: SeriesKey) =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[key])}`).join(" ");
  const areaPath = (key: SeriesKey) =>
    `${linePath(key)} L${x(data.length - 1)},${PAD.t + innerH} L${x(0)},${PAD.t + innerH} Z`;

  const point = hover === null ? undefined : data[hover];

  return (
    <div className="relative w-full">
      <div className="mb-3 flex items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Notas ingestadas y publicadas por día"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const i = Math.round(ratio * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient
              key={s.key}
              id={`area-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + innerH * t}
            y2={PAD.t + innerH * t}
            stroke="var(--color-line)"
            strokeWidth={1}
            opacity={0.6}
          />
        ))}

        {SERIES.map((s) => (
          <g key={s.key}>
            <path d={areaPath(s.key)} fill={`url(#area-${s.key})`} />
            <motion.path
              d={linePath(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </g>
        ))}

        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text
              key={d.dia}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-[var(--color-muted)] font-mono"
              fontSize={10}
            >
              {d.dia}
            </text>
          ) : null,
        )}

        {hover !== null && point && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.t}
              y2={PAD.t + innerH}
              stroke="var(--color-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {SERIES.map((s) => (
              <circle
                key={s.key}
                cx={x(hover)}
                cy={y(point[s.key])}
                r={4}
                fill="var(--color-surface)"
                stroke={s.color}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>

      {hover !== null && point && (
        <div
          className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="mb-1 font-mono text-muted">{point.dia}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-mono font-medium text-fg">{point[s.key]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
