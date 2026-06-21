"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast, useToast } from "@/components/ui/toast";
import { colaModeracion } from "@/data/moderacion";
import { QueueList } from "./queue-list";
import { ReviewPanel, type ReviewAction } from "./review-panel";

export function ModerationBoard() {
  const [notas, setNotas] = useState(colaModeracion);
  const [resueltas, setResueltas] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState(colaModeracion[0]!.id);
  const [versionIdx, setVersionIdx] = useState(0);
  const [view, setView] = useState<"diff" | "limpio">("diff");
  const [editing, setEditing] = useState(false);
  const { message, show } = useToast();

  const pendientes = useMemo(
    () => notas.filter((n) => !resueltas.has(n.id)),
    [notas, resueltas],
  );
  const nota = pendientes.find((n) => n.id === selectedId) ?? pendientes[0];

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
    const idx = pendientes.findIndex((n) => n.id === nota.id);
    const next = pendientes[idx + 1] ?? pendientes[idx - 1];
    setResueltas((prev) => new Set(prev).add(nota.id));
    if (next) select(next.id);
    show(
      a === "aprobar"
        ? "Versión aprobada y enviada a publicación"
        : "Nota rechazada",
    );
  }

  function saveEdit(titulo: string, contenido: string) {
    if (!nota) return;
    setNotas((prev) =>
      prev.map((n) =>
        n.id === nota.id
          ? {
              ...n,
              versiones: n.versiones.map((v, i) =>
                i === versionIdx ? { ...v, titulo, contenido } : v,
              ),
            }
          : n,
      ),
    );
    setEditing(false);
    setView("diff");
    show("Versión actualizada");
  }

  if (!nota) {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Cola vacía"
        description="No quedan notas esperando moderación. Buen trabajo."
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
          {pendientes.length} notas esperando revisión
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <QueueList notes={pendientes} selectedId={nota.id} onSelect={select} />

        <Card className="flex min-h-[40rem] flex-col overflow-hidden">
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
