"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ExternalLink,
  Inbox,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  aprobarVarias,
  aprobarVariasYEnviar,
  descartarVarias,
} from "@/server/curaduria";

export type EntradaRow = {
  id: string;
  titulo: string;
  fuente: string;
  escenario: string | null;
  resumen: string;
  imagenUrl: string | null;
  urlOriginal: string;
  fecha: string;
};

export function CuraduriaBoard({ entradas }: { entradas: EntradaRow[] }) {
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [lista, setLista] = useState(entradas);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const seleccion = [...sel];
  const todoSel = lista.length > 0 && sel.size === lista.length;

  function toggle(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleTodo() {
    setSel(todoSel ? new Set() : new Set(lista.map((e) => e.id)));
  }

  function quitar(ids: string[]) {
    const set = new Set(ids);
    setLista((prev) => prev.filter((e) => !set.has(e.id)));
    setSel((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  function aprobar(ids: string[]) {
    if (ids.length === 0) return;
    quitar(ids);
    startTransition(async () => {
      await aprobarVarias(ids);
      show(
        ids.length === 1
          ? "Aprobada · generando…"
          : `${ids.length} aprobadas · generando…`,
      );
    });
  }
  function aprobarBandeja(ids: string[]) {
    if (ids.length === 0) return;
    quitar(ids);
    startTransition(async () => {
      await aprobarVariasYEnviar(ids);
      show(
        ids.length === 1
          ? "Aprobada · va a la bandeja de salida"
          : `${ids.length} aprobadas · van a la bandeja de salida`,
      );
    });
  }
  function descartar(ids: string[]) {
    if (ids.length === 0) return;
    quitar(ids);
    startTransition(async () => {
      await descartarVarias(ids);
      show(ids.length === 1 ? "Descartada" : `${ids.length} descartadas`);
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Bandeja de entrada"
        subtitle="Notas ingestadas en crudo. Aprobá las que querés (recién ahí la IA genera) y descartá el resto."
      />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Stat label="En cola" value={String(lista.length)} />
        <Stat label="Seleccionadas" value={String(sel.size)} />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Bandeja vacía"
          description="No hay notas pendientes de curar. Corré una ingesta en Fuentes para traer novedades."
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={todoSel}
                onChange={toggleTodo}
                className="size-4 accent-[var(--color-brand)]"
              />
              Seleccionar todo
            </label>
            <AnimatePresence>
              {sel.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="ml-auto flex gap-2"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => descartar(seleccion)}
                    disabled={pending}
                  >
                    <X className="size-4" />
                    Descartar ({sel.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => aprobarBandeja(seleccion)}
                    disabled={pending}
                  >
                    <SendHorizontal className="size-4" />
A salida ({sel.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => aprobar(seleccion)}
                    disabled={pending}
                  >
                    <Sparkles className="size-4" />
                    Aprobar ({sel.size})
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {lista.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={cn(
                      "flex gap-4 p-4 transition-colors",
                      sel.has(e.id) && "border-brand/40 bg-brand/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={sel.has(e.id)}
                      onChange={() => toggle(e.id)}
                      className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
                    />
                    {e.imagenUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.imagenUrl}
                        alt=""
                        className="hidden size-20 shrink-0 rounded-lg object-cover sm:block"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">{e.fuente}</span>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted">{e.fecha}</span>
                        {e.escenario && (
                          <Badge tone="brand" className="ml-1">
                            → {e.escenario}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-display text-base font-medium leading-snug text-fg">
                        {e.titulo}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {e.resumen}
                      </p>
                      <a
                        href={e.urlOriginal}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand hover:underline"
                      >
                        ver original <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => aprobar([e.id])}
                        disabled={pending}
                      >
                        <Check className="size-4" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => aprobarBandeja([e.id])}
                        disabled={pending}
                        title="Aprobar y enviar directo a la bandeja (saltea Moderación)"
                      >
                        <SendHorizontal className="size-4" />
                        A salida
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => descartar([e.id])}
                        disabled={pending}
                      >
                        <X className="size-4" />
                        Descartar
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <Toast message={message} />
    </div>
  );
}
