"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast, useToast } from "@/components/ui/toast";
import {
  guardarEdicion,
  rechazarNota,
  setImagen,
} from "@/server/moderacion";
import { enviarACola } from "@/server/cola";
import { publicar, type Asignacion } from "@/server/publicar";
import { PublishDialog } from "./publish-dialog";
import { QueueList } from "./queue-list";
import { ReviewPanel, type ReviewAction } from "./review-panel";
import type { DestinoLite, NotaView } from "./types";

export function ModerationBoard({
  notas,
  destinos,
}: {
  notas: NotaView[];
  destinos: DestinoLite[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versionIdx, setVersionIdx] = useState(0);
  const [view, setView] = useState<"diff" | "limpio">("diff");
  const [editing, setEditing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const { message, show } = useToast();

  const nota = notas.find((n) => n.id === selectedId) ?? notas[0];

  function select(id: string) {
    setSelectedId(id);
    setVersionIdx(0);
    setView("diff");
    setEditing(false);
  }

  function handleAction(a: ReviewAction) {
    if (!nota) return;
    if (a === "editar") {
      setEditing(true);
      return;
    }
    if (a === "publicar") {
      setPublishOpen(true);
      return;
    }
    startTransition(async () => {
      await rechazarNota(nota.id);
      show("Nota rechazada");
      setSelectedId(null);
      setVersionIdx(0);
    });
  }

  function doPublicar(asignaciones: Asignacion[]) {
    if (!nota) return;
    startTransition(async () => {
      const r = await publicar(nota.id, asignaciones);
      setPublishOpen(false);
      if (r.errores.length === 0) {
        setSelectedId(null);
        setVersionIdx(0);
        show(`Publicada en ${r.publicadas}`);
      } else if (r.publicadas === 0) {
        show(`Falló: ${r.errores[0]!.error}`);
      } else {
        setSelectedId(null);
        setVersionIdx(0);
        show(`Publicada en ${r.publicadas}, falló en ${r.errores.length}`);
      }
    });
  }

  function doEnviarCola(asignaciones: Asignacion[]) {
    if (!nota) return;
    startTransition(async () => {
      await enviarACola(nota.id, asignaciones);
      setPublishOpen(false);
      setSelectedId(null);
      setVersionIdx(0);
      show(`Enviada a la cola (${asignaciones.length})`);
    });
  }

  function saveEdit(titulo: string, contenido: string) {
    if (!nota) return;
    const version = nota.versiones[versionIdx] ?? nota.versiones[0]!;
    startTransition(async () => {
      await guardarEdicion(version.id, titulo, contenido);
      setEditing(false);
      setView("diff");
      show("Versión actualizada");
    });
  }

  if (!nota) {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Cola vacía"
        description="No hay versiones esperando moderación. Generá notas desde «Pegar URL»."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
          Cola de moderación
        </h2>
        <p className="mt-1 text-sm text-muted">
          {notas.length} {notas.length === 1 ? "nota" : "notas"} esperando
          revisión
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <QueueList notes={notas} selectedId={nota.id} onSelect={select} />

        <Card
          className={`flex min-h-[40rem] flex-col overflow-hidden ${
            pending ? "opacity-70" : ""
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={nota.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full flex-col"
            >
              <ReviewPanel
                nota={nota}
                versionIdx={versionIdx}
                view={view}
                editing={editing}
                onVersion={setVersionIdx}
                onView={setView}
                onAction={handleAction}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditing(false)}
                onSetImagen={(url) =>
                  startTransition(async () => {
                    await setImagen(nota.id, url);
                    show(url ? "Imagen actualizada" : "Imagen eliminada");
                  })
                }
              />
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        pending={pending}
        versiones={nota.versiones.map((v) => ({ id: v.id, titulo: v.titulo }))}
        covers={[nota.imagenUrl, ...nota.imagenes].filter(
          (u): u is string => !!u,
        )}
        destinos={destinos}
        defaultVersionId={(nota.versiones[versionIdx] ?? nota.versiones[0]!).id}
        onConfirm={doPublicar}
        onQueue={doEnviarCola}
      />

      <Toast message={message} />
    </div>
  );
}
