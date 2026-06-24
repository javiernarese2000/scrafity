"use client";

import { Globe, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { Asignacion } from "@/server/publicar";
import type { DestinoLite } from "./types";

type Sel = {
  versionId: string;
  imagenUrl: string | null;
};

export function PublishDialog({
  open,
  onClose,
  pending,
  versiones,
  covers,
  destinos,
  defaultVersionId,
  onConfirm,
  onQueue,
}: {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  versiones: { id: string; titulo: string }[];
  covers: string[];
  destinos: DestinoLite[];
  defaultVersionId: string;
  onConfirm: (asignaciones: Asignacion[]) => void;
  onQueue?: (asignaciones: Asignacion[]) => void;
}) {
  const defaultCover = covers[0] ?? null;
  const [sel, setSel] = useState<Record<string, Sel>>({});

  // Resetear la selección al abrir o al cambiar de nota: si no, quedan destinos
  // marcados con el versionId de la nota anterior (encola/publica la equivocada).
  useEffect(() => {
    if (open) setSel({});
  }, [open, defaultVersionId]);

  function toggle(destino: DestinoLite) {
    const id = destino.id;
    setSel((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { versionId: defaultVersionId, imagenUrl: defaultCover };
      return next;
    });
  }
  function patch(id: string, p: Partial<Sel>) {
    setSel((prev) => ({ ...prev, [id]: { ...prev[id]!, ...p } }));
  }

  const asignaciones: Asignacion[] = Object.entries(sel).map(([destinationId, s]) => ({
    destinationId,
    versionId: s.versionId,
    imagenUrl: s.imagenUrl,
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
              Elegí a qué diarios va; podés definir versión y portada por cada uno.
            </p>
            <div className="space-y-2">
              {destinos.map((d) => {
                const s = sel[d.id];
                const selected = !!s;
                const esWp = d.tipo === "wordpress_cliente";
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "rounded-[var(--radius)] border p-3 transition-colors",
                      selected ? "border-brand/40 bg-brand/8" : "border-line",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggle(d)}
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
                    </div>

                    {selected && (versiones.length > 1 || covers.length > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                        {versiones.length > 1 && (
                          <label className="flex items-center gap-1.5 text-xs text-muted">
                            Versión
                            <select
                              value={s!.versionId}
                              onChange={(e) =>
                                patch(d.id, { versionId: e.target.value })
                              }
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg focus:outline-none"
                            >
                              {versiones.map((v, i) => (
                                <option key={v.id} value={v.id}>
                                  V{i + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {covers.length > 0 && (
                          <label className="flex items-center gap-1.5 text-xs text-muted">
                            Portada
                            <select
                              value={s!.imagenUrl ?? ""}
                              onChange={(e) =>
                                patch(d.id, {
                                  imagenUrl: e.target.value || null,
                                })
                              }
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg focus:outline-none"
                            >
                              {covers.map((url, i) => (
                                <option key={url} value={url}>
                                  {i === 0 ? "Por defecto" : `Imagen ${i + 1}`}
                                </option>
                              ))}
                              <option value="">Sin imagen</option>
                            </select>
                          </label>
                        )}
                      </div>
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
          {onQueue && (
            <Button
              variant="outline"
              onClick={() => onQueue(asignaciones)}
              disabled={pending || asignaciones.length === 0}
            >
              Enviar a la cola
            </Button>
          )}
          <Button
            onClick={() => onConfirm(asignaciones)}
            disabled={pending || asignaciones.length === 0}
          >
            Publicar ahora ({asignaciones.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
