"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Sparkles, Trash2, Trash } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import {
  eliminarDefinitivo,
  limpiarAhora,
  restaurarNota,
  vaciarPapelera,
} from "@/server/biblioteca";

export type PapeleraRow = {
  id: string;
  titulo: string;
  fuente: string;
  eliminada: string;
};

export function PapeleraBoard({ items }: { items: PapeleraRow[] }) {
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [lista, setLista] = useState(items);

  function quitar(id: string) {
    setLista((prev) => prev.filter((x) => x.id !== id));
  }

  // Si el servidor falla tras haber quitado la fila de la vista (optimista),
  // hay que devolverla — si no, queda "eliminada" solo en la pantalla, sin
  // avisar que en realidad no se guardó nada.
  function restaurar(r: PapeleraRow) {
    quitar(r.id);
    startTransition(async () => {
      try {
        await restaurarNota(r.id);
        show("Restaurada");
      } catch {
        setLista((prev) => [...prev, r]);
        show("No se pudo restaurar. Reintentá.");
      }
    });
  }
  function borrar(r: PapeleraRow) {
    quitar(r.id);
    startTransition(async () => {
      try {
        await eliminarDefinitivo(r.id);
        show("Eliminada definitivamente");
      } catch {
        setLista((prev) => [...prev, r]);
        show("No se pudo eliminar. Reintentá.");
      }
    });
  }
  function vaciar() {
    const previa = lista;
    setLista([]);
    startTransition(async () => {
      try {
        await vaciarPapelera();
        show("Papelera vaciada");
      } catch {
        setLista(previa);
        show("No se pudo vaciar la papelera. Reintentá.");
      }
    });
  }
  function limpiar() {
    startTransition(async () => {
      try {
        const r = await limpiarAhora();
        show(`${r.aPapelera} a papelera · ${r.purgadas} purgadas`);
      } catch {
        show("No se pudo ejecutar la limpieza. Reintentá.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Papelera"
        subtitle="Notas eliminadas. Se borran definitivamente a los 14 días. Lo descartable de más de 60 días entra solo."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={limpiar} disabled={pending}>
              <Sparkles className="size-4" />
              Ejecutar limpieza
            </Button>
            {lista.length > 0 && (
              <Button variant="outline" onClick={vaciar} disabled={pending}>
                <Trash className="size-4" />
                Vaciar
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6">
        <Stat label="En la papelera" value={String(lista.length)} />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Papelera vacía"
          description="No hay notas eliminadas. Lo que borres aparece acá y es recuperable por unos días."
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {lista.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <Card className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {r.titulo}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.fuente} · eliminada {r.eliminada}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restaurar(r)}
                    disabled={pending}
                  >
                    <RotateCcw className="size-4" />
                    Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => borrar(r)}
                    disabled={pending}
                    aria-label="Eliminar definitivamente"
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
