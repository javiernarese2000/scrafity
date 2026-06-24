"use client";

import { motion } from "framer-motion";
import { Radio, Server } from "lucide-react";

const VIZ = [
  "--color-viz-1",
  "--color-viz-2",
  "--color-viz-3",
  "--color-viz-5",
  "--color-viz-4",
  "--color-viz-6",
];
const OFFSETS = [-10, 6, -4, 11, 0, -8, 5];

const dots: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--color-muted) 0.5px, transparent 0.5px)",
  backgroundSize: "12px 12px",
  opacity: 0.1,
};

/** Preloader: las fuentes emiten notas que el servidor "absorbe". */
export function IngestAnimation({
  activo,
  nuevas,
}: {
  activo: boolean;
  nuevas: number;
}) {
  return (
    <div className="relative mb-4 h-32 overflow-hidden rounded-[var(--radius-lg)] border border-line/60 bg-elevated/25">
      <style>{`@keyframes scrapify-nota{
        0%{left:19%;opacity:0;transform:translateY(-50%) scale(.4)}
        14%{opacity:1;transform:translateY(-50%) scale(1)}
        80%{opacity:1}
        100%{left:79%;opacity:0;transform:translateY(-50%) scale(.3)}
      }`}</style>

      <div className="pointer-events-none absolute inset-0" style={dots} />

      <div className="absolute inset-x-[21%] top-1/2 -translate-y-1/2 border-t border-dashed border-line/70" />

      {/* Fuentes */}
      <div className="absolute left-5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5">
        <motion.span
          className="grid size-12 place-items-center rounded-2xl border border-line bg-surface text-brand shadow-soft"
          animate={activo ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Radio className="size-5" />
        </motion.span>
        <span className="text-[10px] font-medium text-muted">Fuentes</span>
      </div>

      {/* Servidor */}
      <div className="absolute right-5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5">
        <span className="relative grid size-12 place-items-center rounded-2xl border border-line bg-surface text-fg shadow-soft">
          <Server className="size-5" />
          {activo && (
            <motion.span
              className="absolute inset-0 rounded-2xl border-2 border-brand"
              animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {nuevas > 0 && (
            <motion.span
              key={nuevas}
              initial={{ scale: 1.6, y: -3 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
              className="absolute -right-2.5 -top-2.5 grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-medium text-brand-foreground shadow-float"
            >
              {nuevas}
            </motion.span>
          )}
        </span>
        <span className="text-[10px] font-medium text-muted">Servidor</span>
      </div>

      {/* Notas en flujo */}
      {activo &&
        Array.from({ length: OFFSETS.length }).map((_, i) => (
          <span
            key={i}
            className="absolute size-3.5 rounded-[3px] shadow-soft"
            style={{
              top: `calc(50% + ${OFFSETS[i]}px)`,
              backgroundColor: `var(${VIZ[i % VIZ.length]})`,
              animation: `scrapify-nota ${(1.6 + (i % 3) * 0.25).toFixed(2)}s linear ${(i * 0.28).toFixed(2)}s infinite`,
            }}
          />
        ))}
    </div>
  );
}
