"use client";

import { Badge } from "@scrapify/ui/badge";
import { PageHeader } from "@scrapify/ui/page-header";
import { Toast, useToast } from "@scrapify/ui/toast";
import {
  AlertCircle,
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  Send,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { PublicarDialog } from "@/components/renders/publicar-dialog";
import type { ClienteConCuentas } from "@/server/cuentas";
import {
  cancelarRender,
  eliminarRender,
  listarRenders,
  pausarRender,
  reanudarRender,
  reintentarRender,
  type RenderRow,
} from "@/server/render";

const ESTADO: Record<
  string,
  { label: string; tone: "neutral" | "warning" | "info" | "success" | "danger" }
> = {
  en_cola: { label: "En cola", tone: "neutral" },
  pausado: { label: "Pausado", tone: "warning" },
  procesando: { label: "Renderizando", tone: "info" },
  listo: { label: "Listo", tone: "success" },
  error: { label: "Error", tone: "danger" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

function fmtDur(s: number | null) {
  if (!s) return "";
  return s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IconBtn({
  icon: Icon,
  title,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        "grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-elevated hover:text-fg " +
        (danger ? "hover:border-danger/40 hover:text-danger" : "")
      }
    >
      <Icon className="size-4" />
    </button>
  );
}

export function RendersBoard({
  inicial,
  clientes,
}: {
  inicial: RenderRow[];
  clientes: ClienteConCuentas[];
}) {
  const { message, show } = useToast();
  const [rows, setRows] = useState<RenderRow[]>(inicial);
  const [publicar, setPublicar] = useState<RenderRow | null>(null);
  const [preview, setPreview] = useState<RenderRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<RenderRow | null>(null);
  const [, startTransition] = useTransition();

  async function refrescar() {
    setRows(await listarRenders());
  }

  // Polling en vivo mientras haya renders activos.
  useEffect(() => {
    const t = setInterval(() => {
      listarRenders().then(setRows).catch(() => {});
    }, 2500);
    return () => clearInterval(t);
  }, []);

  function accion(fn: (id: string) => Promise<void>, id: string, msg: string) {
    startTransition(async () => {
      await fn(id);
      await refrescar();
      show(msg);
    });
  }

  const activos = rows.filter((r) =>
    ["en_cola", "pausado", "procesando"].includes(r.estado),
  ).length;

  return (
    <div className="w-full">
      <PageHeader
        title="Renders"
        subtitle="La cola de render: progreso en vivo, descarga y control de cada video."
        action={
          activos > 0 ? (
            <Badge tone="info">{activos} en proceso</Badge>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-line/70 bg-surface py-16 text-center shadow-soft">
          <span className="grid size-14 place-items-center rounded-2xl border border-line bg-elevated text-muted">
            <Film className="size-6" />
          </span>
          <p className="mt-4 font-display text-lg font-medium text-fg">
            Todavía no hay renders
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Creá un video en el Estudio y mandalo a render; va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const e = ESTADO[r.estado] ?? ESTADO.en_cola!;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line/70 bg-surface p-3 shadow-soft"
              >
                {/* Miniatura (clic = ver el video si está listo) */}
                {r.outputUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreview(r)}
                    title="Ver video"
                    className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated"
                  >
                    {r.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Film className="size-5 text-muted" />
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="grid size-7 place-items-center rounded-full bg-white/90 text-neutral-900">
                        <Play className="size-3.5 translate-x-px" fill="currentColor" />
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated">
                    {r.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Film className="size-5 text-muted" />
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-fg">
                      {r.titulo || "Sin título"}
                    </p>
                    <Badge tone={e.tone}>{e.label}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted">
                    {r.clienteNombre ?? "—"} · {fmtFecha(r.createdAt)}
                    {r.estado === "listo" && r.duracionSeg
                      ? ` · ${fmtDur(r.duracionSeg)}`
                      : ""}
                  </p>

                  {r.estado === "procesando" && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full bg-info transition-[width] duration-500"
                          style={{ width: `${r.progreso}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted">
                        {r.progreso}%
                      </span>
                    </div>
                  )}

                  {r.estado === "error" && r.error && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-danger">
                      <AlertCircle className="size-3.5 shrink-0" />
                      {r.error}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.estado === "en_cola" && (
                    <>
                      <IconBtn icon={Pause} title="Pausar" onClick={() => accion(pausarRender, r.id, "Pausado")} />
                      <IconBtn icon={X} title="Cancelar" danger onClick={() => accion(cancelarRender, r.id, "Cancelado")} />
                    </>
                  )}
                  {r.estado === "pausado" && (
                    <>
                      <IconBtn icon={Play} title="Reanudar" onClick={() => accion(reanudarRender, r.id, "Reanudado")} />
                      <IconBtn icon={X} title="Cancelar" danger onClick={() => accion(cancelarRender, r.id, "Cancelado")} />
                    </>
                  )}
                  {r.estado === "procesando" && (
                    <IconBtn icon={X} title="Cancelar" danger onClick={() => accion(cancelarRender, r.id, "Cancelando…")} />
                  )}
                  {r.estado === "listo" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPublicar(r)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-brand-foreground transition-all hover:opacity-90"
                      >
                        <Send className="size-3.5" />
                        Publicar
                      </button>
                      {r.outputUrl && (
                        <a
                          href={r.outputUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          title="Descargar"
                          className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                      <IconBtn icon={Trash2} title="Eliminar" danger onClick={() => setConfirmDel(r)} />
                    </>
                  )}
                  {(r.estado === "error" || r.estado === "cancelado") && (
                    <>
                      {r.sourceEliminado ? (
                        <span
                          title="El video original se borró (retención de 14 días). Volvé a subirlo desde el Estudio."
                          className="hidden text-[11px] text-muted sm:block"
                        >
                          original borrado
                        </span>
                      ) : (
                        <IconBtn icon={RotateCcw} title="Reintentar" onClick={() => accion(reintentarRender, r.id, "Reencolado")} />
                      )}
                      <IconBtn icon={Trash2} title="Eliminar" danger onClick={() => setConfirmDel(r)} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {publicar && (
        <PublicarDialog
          render={publicar}
          clientes={clientes}
          onClose={() => setPublicar(null)}
          onDone={(n) => {
            setPublicar(null);
            show(
              n === 1
                ? "Publicación encolada"
                : `${n} publicaciones encoladas`,
            );
          }}
        />
      )}

      {/* Preview del video */}
      {preview?.outputUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
              <p className="min-w-0 truncate font-display text-sm font-medium text-fg">
                {preview.titulo || "Sin título"}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid place-items-center bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={preview.outputUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line/70 px-4 py-3">
              <span className="text-xs text-muted">
                {preview.clienteNombre ?? "—"}
                {preview.duracionSeg ? ` · ${fmtDur(preview.duracionSeg)}` : ""}
              </span>
              <a
                href={preview.outputUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated hover:text-fg"
              >
                <Download className="size-3.5" />
                Descargar
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de borrado */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmDel(null)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                <Trash2 className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-medium text-fg">
                  ¿Eliminar este contenido?
                </p>
                <p className="mt-1 text-sm text-muted">
                  Vas a borrar{" "}
                  <span className="font-medium text-fg">
                    {confirmDel.titulo || "este render"}
                  </span>
                  . Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDel(null)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted hover:bg-elevated hover:text-fg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmDel.id;
                  setConfirmDel(null);
                  accion(eliminarRender, id, "Eliminado");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-xs font-medium text-white transition-all hover:opacity-90"
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
