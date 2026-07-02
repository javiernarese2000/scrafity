"use client";

import type { FuenteProgreso } from "@scrapify/db";
import { Check, DownloadCloud, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { IngestAnimation } from "@/components/fuentes/ingest-animation";
import { Button } from "@/components/ui/button";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { estadoIngesta, iniciarIngesta, type EstadoIngesta } from "@/server/fuentes";

export type FuenteLite = { id: string; nombre: string; categoria: string | null };
export type DestinoLite = { id: string; nombre: string; categorias: string[] };

const DOT: Record<FuenteProgreso["estado"], string> = {
  pendiente: "var(--color-muted)",
  corriendo: "var(--color-brand)",
  ok: "var(--color-success)",
  error: "var(--color-danger)",
};

export function TraerDialog({
  fuentes = [],
  destinos = [],
  categorias = [],
  open,
  onClose,
  onDone,
}: {
  fuentes: FuenteLite[];
  destinos: DestinoLite[];
  categorias: string[];
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [destinoSel, setDestinoSel] = useState("");
  const [catsSel, setCatsSel] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(fuentes.map((f) => f.id)),
  );
  const [maxPorFuente, setMaxPorFuente] = useState(10);
  const [palabra, setPalabra] = useState("");
  const [run, setRun] = useState<EstadoIngesta | null>(null);
  const [iniciando, setIniciando] = useState(false);

  const corriendo = run?.estado === "corriendo";
  const runId = run?.id ?? null;

  function elegirDestino(id: string) {
    setDestinoSel(id);
    const d = destinos.find((x) => x.id === id);
    setCatsSel(new Set(d?.categorias ?? []));
  }
  function toggleCat(c: string) {
    setDestinoSel("");
    setCatsSel((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  }

  useEffect(() => {
    if (!runId || !corriendo) return;
    const t = setInterval(async () => {
      const r = await estadoIngesta(runId);
      if (r) setRun(r);
      if (r && r.estado !== "corriendo") {
        clearInterval(t);
        onDone();
      }
    }, 1500);
    return () => clearInterval(t);
  }, [runId, corriendo, onDone]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function traer() {
    if (selected.size === 0) return;
    setIniciando(true);
    try {
      const { runId } = await iniciarIngesta({
        sourceIds: [...selected],
        categorias: catsSel.size > 0 ? [...catsSel] : undefined,
        maxPorFuente,
        palabra: palabra.trim() || undefined,
      });
      const r = await estadoIngesta(runId);
      setRun(r);
    } finally {
      setIniciando(false);
    }
  }

  function cerrar() {
    if (corriendo) return; // no cerrar mientras trae
    setRun(null);
    onClose();
  }

  const terminado = run != null && run.estado !== "corriendo";

  return (
    <Modal open={open} onClose={cerrar} title="Traer noticias">
      {run ? (
        <div className="space-y-4">
          <IngestAnimation activo={corriendo} nuevas={run.nuevas} />
          <div className="flex items-center gap-3">
            {corriendo ? (
              <Loader2 className="size-5 animate-spin text-accent" />
            ) : (
              <Check className="size-5 text-success" />
            )}
            <p className="text-sm font-medium text-fg">
              {corriendo ? "Trayendo noticias…" : "Listo"}
            </p>
            <span className="ml-auto font-mono text-sm text-fg">
              {run.nuevas} nuevas
              {run.saltadas > 0 && (
                <span className="text-muted"> · {run.saltadas} salteadas</span>
              )}
            </span>
          </div>

          {run.fuentes.length > 0 && (
            <ul className="max-h-52 space-y-1.5 overflow-y-auto">
              {run.fuentes.map((f) => (
                <li
                  key={f.nombre}
                  className="flex items-center gap-2 rounded-lg border border-line/50 px-3 py-2 text-sm"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: DOT[f.estado] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-fg">{f.nombre}</span>
                  <span className="font-mono text-xs text-muted">{f.nuevas}</span>
                </li>
              ))}
            </ul>
          )}

          {run.errores.length > 0 && (
            <ul className="space-y-1">
              {run.errores.map((e, i) => (
                <li key={i} className="text-xs text-danger">
                  {e}
                </li>
              ))}
            </ul>
          )}

          {terminado && (
            <div className="flex justify-end">
              <Button onClick={cerrar}>Ver en el feed</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {destinos.length > 0 && (
            <Field label="Para qué destino (opcional)">
              <select
                value={destinoSel}
                onChange={(e) => elegirDestino(e.target.value)}
                className={inputCls}
              >
                <option value="">— Elegí un destino —</option>
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {categorias.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-muted">
                Categorías {catsSel.size > 0 ? `(${catsSel.size})` : "· todas"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map((c) => {
                  const on = catsSel.has(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCat(c)}
                      className={
                        "rounded-md border px-2.5 py-1 text-xs transition-colors " +
                        (on
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-line text-muted hover:bg-elevated")
                      }
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs text-muted">
              Fuentes ({selected.size} elegidas)
            </p>
            <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-line p-2">
              {fuentes.length === 0 ? (
                <p className="p-2 text-sm text-muted">No hay fuentes.</p>
              ) : (
                fuentes.map((f) => {
                  const on = selected.has(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggle(f.id)}
                      className={
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-elevated " +
                        (on ? "text-fg" : "text-muted")
                      }
                    >
                      <span
                        className={
                          "grid size-4 shrink-0 place-items-center rounded border " +
                          (on ? "border-accent bg-accent text-brand-foreground" : "border-line")
                        }
                      >
                        {on && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{f.nombre}</span>
                      {f.categoria && (
                        <span className="text-xs text-muted">{f.categoria}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cuántas por fuente">
              <input
                type="number"
                min={1}
                max={50}
                value={maxPorFuente}
                onChange={(e) => setMaxPorFuente(Number(e.target.value) || 1)}
                className={inputCls}
              />
            </Field>
            <Field label="Filtro por palabra (opcional)">
              <input
                value={palabra}
                onChange={(e) => setPalabra(e.target.value)}
                placeholder="Ej. elecciones"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button onClick={traer} disabled={iniciando || selected.size === 0}>
              <DownloadCloud className="size-4" />
              {iniciando ? "Iniciando…" : "Traer"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
