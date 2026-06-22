"use client";

import { motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Image as ImageIcon,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { setArchivada } from "@/server/biblioteca";
import { estadoInfo, type EstadoNota, type NotaCard } from "./types";

type Filtro = "todas" | EstadoNota;

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "en_revision", label: "En revisión" },
  { key: "aprobada", label: "Aprobadas" },
  { key: "publicada", label: "Publicadas" },
  { key: "archivada", label: "Archivadas" },
];

export function BibliotecaBoard({ notas }: { notas: NotaCard[] }) {
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");

  const conteos = useMemo(() => {
    const c: Record<string, number> = { todas: notas.length };
    for (const n of notas) c[n.estado] = (c[n.estado] ?? 0) + 1;
    return c;
  }, [notas]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtro !== "todas" && n.estado !== filtro) return false;
      if (!term) return true;
      return (
        n.titulo.toLowerCase().includes(term) ||
        n.fuente.toLowerCase().includes(term) ||
        n.tags.some((t) => t.includes(term))
      );
    });
  }, [notas, filtro, q]);

  function toggleArchivar(n: NotaCard) {
    startTransition(async () => {
      await setArchivada(n.id, !n.archivada);
      show(n.archivada ? "Desarchivada" : "Archivada");
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Biblioteca"
        subtitle="Todo lo generado: en revisión, aprobado, publicado y archivado."
        action={
          <Link href="/pegar">
            <Button>
              <Plus className="size-4" />
              Nueva nota
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                filtro === f.key
                  ? "border-brand/40 bg-brand/12 text-brand"
                  : "border-line text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-70">
                {conteos[f.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="h-9 w-44 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nada por acá"
          description="No hay notas que coincidan. Generá una nueva desde «Pegar URL»."
        />
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
            pending && "opacity-70",
          )}
        >
          {filtradas.map((n, i) => {
            const info = estadoInfo(n.estado);
            const abrirHref =
              n.estado === "en_revision" ? "/moderacion" : `/biblioteca/${n.id}`;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-float"
              >
                <Link href={abrirHref} className="block">
                  <div className="flex h-32 items-center justify-center bg-elevated text-muted">
                    {n.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.imagenUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-6" />
                    )}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-2.5 p-4">
                  <Badge tone={info.tone} className="self-start">
                    {info.label}
                  </Badge>
                  <Link href={abrirHref}>
                    <h3 className="line-clamp-2 font-display text-[15px] font-medium leading-snug text-fg hover:text-brand">
                      {n.titulo}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted">
                    {n.fuente} · {n.fecha}
                  </p>

                  {n.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {n.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-elevated px-2 py-0.5 text-xs text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-3 border-t border-line/60 pt-3 text-xs text-muted">
                    <span>
                      {n.nVersiones}{" "}
                      {n.nVersiones === 1 ? "versión" : "versiones"}
                    </span>
                    {n.similarity != null && (
                      <span>sim {Math.round(n.similarity * 100)}%</span>
                    )}
                    {n.destinos > 0 && <span>{n.destinos} destinos</span>}
                    <button
                      type="button"
                      onClick={() => toggleArchivar(n)}
                      disabled={pending}
                      aria-label={n.archivada ? "Desarchivar" : "Archivar"}
                      className="ml-auto grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-fg"
                    >
                      {n.archivada ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
