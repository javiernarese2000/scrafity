"use client";

import { Globe, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { Asignacion } from "@/server/publicar";
import type { DestinoLite, NotaView } from "./types";

export function PublishDialog({
  open,
  onClose,
  nota,
  destinos,
  defaultVersionId,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  nota: NotaView;
  destinos: DestinoLite[];
  defaultVersionId: string;
  pending: boolean;
  onConfirm: (asignaciones: Asignacion[]) => void;
}) {
  // destinoId -> versionId (presencia = seleccionado)
  const [sel, setSel] = useState<Record<string, string>>({});

  function toggle(id: string) {
    setSel((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = defaultVersionId;
      return next;
    });
  }

  const asignaciones = Object.entries(sel).map(([destinationId, versionId]) => ({
    destinationId,
    versionId,
  }));

  return (
    <Modal open={open} onClose={onClose} title="Publicar nota">
      <div className="space-y-4">
        {destinos.length === 0 ? (
          <p className="text-sm text-muted">
            No hay destinos cargados. Agregá uno en la sección Destinos.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Elegí a qué destinos va y, si querés, una versión distinta para
              cada uno.
            </p>
            <div className="space-y-2">
              {destinos.map((d) => {
                const selected = d.id in sel;
                const esWp = d.tipo === "wordpress_cliente";
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius)] border p-3 transition-colors",
                      selected ? "border-brand/40 bg-brand/8" : "border-line",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(d.id)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                      {esWp ? (
                        <Globe className="size-4" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">
                        {d.nombre}
                      </p>
                      <p className="text-xs text-muted">
                        {esWp ? "WordPress" : "Sitio propio"}
                      </p>
                    </div>
                    {selected && nota.versiones.length > 1 && (
                      <select
                        value={sel[d.id]}
                        onChange={(e) =>
                          setSel((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg focus:outline-none"
                      >
                        {nota.versiones.map((v, i) => (
                          <option key={v.id} value={v.id}>
                            V{i + 1}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(asignaciones)}
            disabled={pending || asignaciones.length === 0}
          >
            Publicar en {asignaciones.length}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
