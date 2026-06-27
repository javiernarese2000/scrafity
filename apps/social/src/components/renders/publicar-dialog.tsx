"use client";

import { Clock, Send, X, Zap } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { RedIcon } from "@/components/icons/redes";
import type { ClienteConCuentas } from "@/server/cuentas";
import { publicarRender, type RenderRow } from "@/server/render";

/** datetime-local en hora local, redondeado al próximo cuarto de hora. */
function defaultProgramada() {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PublicarDialog({
  render,
  clientes,
  onClose,
  onDone,
}: {
  render: RenderRow;
  clientes: ClienteConCuentas[];
  onClose: () => void;
  onDone: (n: number) => void;
}) {
  const [clienteId, setClienteId] = useState<string>(
    render.clienteId ?? clientes[0]?.id ?? "",
  );
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState(render.titulo ?? "");
  const [modo, setModo] = useState<"ahora" | "programar">("ahora");
  const [programada, setProgramada] = useState(defaultProgramada);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El render puede no tener cliente (renders viejos): se elige uno.
  const fijoCliente = Boolean(render.clienteId);
  const cliente = useMemo(
    () => clientes.find((c) => c.id === clienteId),
    [clientes, clienteId],
  );
  const cuentas = cliente?.cuentas ?? [];

  function toggle(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function confirmar() {
    setError(null);
    if (sel.size === 0) {
      setError("Elegí al menos una cuenta.");
      return;
    }
    startTransition(async () => {
      try {
        const n = await publicarRender({
          renderId: render.id,
          cuentaIds: [...sel],
          caption,
          programadaEn:
            modo === "programar" ? new Date(programada).toISOString() : null,
        });
        onDone(n);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line/70 p-4">
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-fg">
              Publicar a redes
            </p>
            <p className="truncate text-xs text-muted">
              {render.titulo || "Sin título"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Cliente (solo si el render no lo tiene fijo) */}
          {!fijoCliente && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Cliente
              </span>
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  setSel(new Set());
                }}
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Cuentas */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Cuentas destino
            </span>
            {cuentas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-elevated/50 px-3 py-3 text-xs text-muted">
                Este cliente no tiene cuentas. Agregalas en Cuentas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cuentas.map((cta) => {
                  const on = sel.has(cta.id);
                  return (
                    <button
                      key={cta.id}
                      type="button"
                      onClick={() => toggle(cta.id)}
                      className={
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                        (on
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-line text-muted hover:bg-elevated hover:text-fg")
                      }
                    >
                      <RedIcon plataforma={cta.plataforma} className="size-4" />
                      {cta.nombre}
                      {cta.estado !== "conectada" && (
                        <span className="text-[10px] text-warning">·sin conectar</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caption */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Caption
            </span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Texto que acompaña al video…"
              className="w-full resize-none rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
          </label>

          {/* Cuándo */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Cuándo</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModo("ahora")}
                className={
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                  (modo === "ahora"
                    ? "border-accent bg-accent/10 text-fg"
                    : "border-line text-muted hover:bg-elevated")
                }
              >
                <Zap className="size-3.5" />
                Ahora
              </button>
              <button
                type="button"
                onClick={() => setModo("programar")}
                className={
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                  (modo === "programar"
                    ? "border-accent bg-accent/10 text-fg"
                    : "border-line text-muted hover:bg-elevated")
                }
              >
                <Clock className="size-3.5" />
                Programar
              </button>
            </div>
            {modo === "programar" && (
              <input
                type="datetime-local"
                value={programada}
                onChange={(e) => setProgramada(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            )}
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-line/70 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted hover:bg-elevated hover:text-fg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending || sel.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-brand-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-3.5" />
            {pending
              ? "Publicando…"
              : modo === "ahora"
                ? "Publicar"
                : "Programar"}
          </button>
        </div>
      </div>
    </div>
  );
}
