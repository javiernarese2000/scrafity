"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { colorCategoria } from "@/lib/categorias";

export type Bucket = { label: string; cats: string[] };

const SEG = 5;
const MAXSEG = 26;
const COLS = 12;

const dotsStyle: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--color-muted) 0.5px, transparent 0.5px)",
  backgroundSize: "12px 12px",
  opacity: 0.12,
};

function Panel({ titulo, buckets }: { titulo: string; buckets: Bucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = buckets.reduce((a, b) => a + b.cats.length, 0);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius)] border border-line/60 bg-elevated/25 p-3">
      <div className="pointer-events-none absolute inset-0" style={dotsStyle} />
      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-fg">{titulo}</span>
          {hover != null && buckets[hover] ? (
            <span className="font-mono text-xs text-muted">
              {buckets[hover]!.label} · {buckets[hover]!.cats.length}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">{total}</span>
          )}
        </div>

        <div className="relative" style={{ height: SEG * MAXSEG + MAXSEG }}>
          {/* Líneas verticales marcando las horas (cada 2 h) */}
          <div className="pointer-events-none absolute inset-0 flex">
            {Array.from({ length: COLS }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-l border-line/40 first:border-l-0"
              />
            ))}
          </div>

          <div className="relative flex h-full items-end gap-[3px]">
          {buckets.map((b, i) => {
            const segs = b.cats.slice(0, MAXSEG);
            const extra = b.cats.length - segs.length;
            return (
              <motion.div
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                animate={{ opacity: hover == null || hover === i ? 1 : 0.4 }}
                className="flex flex-1 flex-col-reverse items-stretch gap-[1px]"
              >
                {segs.map((c, j) => (
                  <motion.span
                    key={j}
                    initial={{ y: -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: Math.min(i * 0.01 + j * 0.012, 0.4),
                      type: "spring",
                      stiffness: 520,
                      damping: 24,
                    }}
                    className="rounded-[2px]"
                    style={{ height: SEG, backgroundColor: colorCategoria(c) }}
                  />
                ))}
                {extra > 0 && (
                  <span className="text-center text-[8px] leading-none text-muted">
                    +{extra}
                  </span>
                )}
              </motion.div>
            );
          })}
          </div>
        </div>

        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          <span>-24 h</span>
          <span>-12 h</span>
          <span>ahora</span>
        </div>
      </div>
    </div>
  );
}

export function Pulso({
  entrada,
  salida,
  leyenda,
}: {
  entrada: Bucket[];
  salida: Bucket[];
  leyenda: { nombre: string; count: number }[];
}) {
  const total =
    entrada.reduce((a, b) => a + b.cats.length, 0) +
    salida.reduce((a, b) => a + b.cats.length, 0);

  return (
    <Card>
      <CardHeader className="flex-wrap gap-y-2">
        <CardTitle>Pulso · últimas 24 h</CardTitle>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {leyenda.map((l) => (
            <span key={l.nombre} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: colorCategoria(l.nombre) }}
              />
              <span className="capitalize">{l.nombre}</span>
              <span className="font-medium text-fg">{l.count}</span>
            </span>
          ))}
        </div>
      </CardHeader>
      <CardBody>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Sin actividad en las últimas 24 h.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Panel titulo="Entrada · ingesta" buckets={entrada} />
            <Panel titulo="Salida · publicaciones" buckets={salida} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
