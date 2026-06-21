"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type Segment = { label: string; value: number; color: string };

const SIZE = 180;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function Donut({ data }: { data: Segment[] }) {
  const total = data.reduce((acc, s) => acc + s.value, 0);
  const [hover, setHover] = useState<number | null>(null);

  let acc = 0;
  const arcs = data.map((s) => {
    const len = (s.value / total) * C;
    const arc = { ...s, len, offset: acc };
    acc += len;
    return arc;
  });

  const active = hover === null ? undefined : data[hover];

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          {arcs.map((a, i) => (
            <motion.circle
              key={a.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === i ? STROKE + 4 : STROKE}
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: hover === null || hover === i ? 1 : 0.35 }}
              transition={{ duration: 0.25 }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-medium text-fg">
            {active ? active.value : total}
          </span>
          <span className="mt-0.5 max-w-[7rem] text-center text-xs text-muted">
            {active ? active.label : "Total versiones"}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {data.map((s, i) => (
          <li
            key={s.label}
            className="flex cursor-pointer items-center gap-2.5 text-sm"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto font-mono font-medium text-fg">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
