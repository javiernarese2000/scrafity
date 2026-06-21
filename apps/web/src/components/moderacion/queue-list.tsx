"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { NotaModeracion } from "@/data/moderacion";
import { pct, simTone } from "./similarity";

export function QueueList({
  notes,
  selectedId,
  onSelect,
}: {
  notes: NotaModeracion[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {notes.map((n) => {
        const active = n.id === selectedId;
        const mejor = n.versiones.reduce((a, b) =>
          a.similarity <= b.similarity ? a : b,
        );
        const sim = simTone(mejor.similarity);
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={cn(
              "relative w-full rounded-[var(--radius)] border p-4 text-left transition-colors",
              active
                ? "border-line bg-elevated shadow-soft"
                : "border-transparent hover:bg-elevated/60",
            )}
          >
            {active && (
              <span className="absolute left-0 top-4 h-8 w-[3px] rounded-full bg-accent" />
            )}
            <p className="line-clamp-2 font-display text-[15px] font-medium leading-snug text-fg">
              {n.titulo}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              {n.fuente} · {n.fecha}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge>{n.tema}</Badge>
              <Badge tone={sim.tone}>{pct(mejor.similarity)}</Badge>
              <span className="ml-auto text-xs text-muted">
                {n.versiones.length} versiones
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
