"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { colaModeracion } from "@/data/moderacion";
import { QueueList } from "./queue-list";
import { ReviewPanel, type ReviewAction } from "./review-panel";

export function ModerationBoard() {
  const [resueltas, setResueltas] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState(colaModeracion[0]!.id);
  const [versionIdx, setVersionIdx] = useState(0);
  const [view, setView] = useState<"diff" | "limpio">("diff");
  const [toast, setToast] = useState<string | null>(null);

  const pendientes = useMemo(
    () => colaModeracion.filter((n) => !resueltas.has(n.id)),
    [resueltas],
  );
  const nota = pendientes.find((n) => n.id === selectedId) ?? pendientes[0];

  function select(id: string) {
    setSelectedId(id);
    setVersionIdx(0);
    setView("diff");
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function handleAction(a: ReviewAction) {
    if (!nota) return;
    if (a === "editar") {
      showToast("Edición en el editor — próximamente");
      return;
    }
    const idx = pendientes.findIndex((n) => n.id === nota.id);
    const next = pendientes[idx + 1] ?? pendientes[idx - 1];
    setResueltas((prev) => new Set(prev).add(nota.id));
    if (next) select(next.id);
    showToast(
      a === "aprobar"
        ? "Versión aprobada y enviada a publicación"
        : "Nota rechazada",
    );
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
                onVersion={setVersionIdx}
                onView={setView}
                onAction={handleAction}
              />
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-float"
          >
            <CheckCheck className="size-4 text-success" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
