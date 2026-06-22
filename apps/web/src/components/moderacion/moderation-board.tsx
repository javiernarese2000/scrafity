"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast, useToast } from "@/components/ui/toast";
import {
  aprobarVersion,
  guardarEdicion,
  rechazarNota,
} from "@/server/moderacion";
import { QueueList } from "./queue-list";
import { ReviewPanel, type ReviewAction } from "./review-panel";
import type { NotaView } from "./types";

export function ModerationBoard({ notas }: { notas: NotaView[] }) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versionIdx, setVersionIdx] = useState(0);
  const [view, setView] = useState<"diff" | "limpio">("diff");
  const [editing, setEditing] = useState(false);
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
    const version = nota.versiones[versionIdx] ?? nota.versiones[0]!;
    if (a === "editar") {
      setEditing(true);
      return;
    }
    startTransition(async () => {
      if (a === "aprobar") {
        await aprobarVersion(version.id, nota.id);
        show("Versión aprobada");
      } else {
        await rechazarNota(nota.id);
        show("Nota rechazada");
      }
      setSelectedId(null);
      setVersionIdx(0);
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
              />
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      <Toast message={message} />
    </div>
  );
}
