"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Check, ExternalLink, Image as ImageIcon, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { DiffView } from "./diff-view";
import { pct, simTone } from "./similarity";
import { proveedorLabel, type NotaView } from "./types";

export type ReviewAction = "aprobar" | "editar" | "rechazar";

export function ReviewPanel({
  nota,
  versionIdx,
  view,
  editing,
  onVersion,
  onView,
  onAction,
  onSaveEdit,
  onCancelEdit,
  onSetImagen,
}: {
  nota: NotaView;
  versionIdx: number;
  view: "diff" | "limpio";
  editing: boolean;
  onVersion: (idx: number) => void;
  onView: (v: "diff" | "limpio") => void;
  onAction: (a: ReviewAction) => void;
  onSaveEdit: (titulo: string, contenido: string) => void;
  onCancelEdit: () => void;
  onSetImagen: (url: string | null) => void;
}) {
  const version = nota.versiones[versionIdx] ?? nota.versiones[0]!;
  const sim = simTone(version.similarity);
  const palabras = version.contenido.split(/\s+/).filter(Boolean).length;
  const tokens =
    version.tokensIn != null && version.tokensOut != null
      ? version.tokensIn + version.tokensOut
      : null;

  const [titulo, setTitulo] = useState(version.titulo);
  const [contenido, setContenido] = useState(version.contenido);
  const [openImg, setOpenImg] = useState(false);
  const [imgUrl, setImgUrl] = useState("");

  useEffect(() => {
    if (editing) {
      setTitulo(version.titulo);
      setContenido(version.contenido);
    }
  }, [editing, version.titulo, version.contenido]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line/70 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge tone={sim.tone}>
            Similitud {pct(version.similarity)} · {sim.label}
          </Badge>
          <Badge>{proveedorLabel(version.proveedor)}</Badge>
          {editing && <Badge tone="accent">Editando V{versionIdx + 1}</Badge>}
        </div>
        <h2 className="font-display text-2xl font-medium leading-tight text-fg">
          {version.titulo}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{nota.fuente}</span>
          {nota.autor && (
            <>
              <span>·</span>
              <span>{nota.autor}</span>
            </>
          )}
          <span>·</span>
          <span>{nota.fecha}</span>
          <a
            href={nota.urlOriginal}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand hover:underline"
          >
            ver original <ExternalLink className="size-3" />
          </a>
        </p>

        {!editing && (
          <div className="mt-5 flex items-center gap-2">
            <LayoutGroup id="versiones">
              {nota.versiones.map((v, i) => {
                const active = i === versionIdx;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onVersion(i)}
                    className={cn(
                      "relative rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="version-pill"
                        className="absolute inset-0 rounded-lg bg-elevated"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 32,
                        }}
                      />
                    )}
                    <span className="relative">V{i + 1}</span>
                  </button>
                );
              })}
            </LayoutGroup>

            <div className="ml-auto flex rounded-lg border border-line p-0.5">
              {(["diff", "limpio"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onView(v)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    view === v ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Imagen de la nota */}
        {!editing && (
          <div className="mb-5">
            {nota.imagenUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nota.imagenUrl}
                  alt=""
                  className="max-h-64 w-full rounded-[var(--radius)] object-cover"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImgUrl(nota.imagenUrl ?? "");
                      setOpenImg(true);
                    }}
                  >
                    Reemplazar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onClick={() => onSetImagen(null)}
                  >
                    Eliminar imagen
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImgUrl("");
                  setOpenImg(true);
                }}
              >
                <ImageIcon className="size-4" />
                Agregar imagen
              </Button>
            )}
          </div>
        )}

        {editing ? (
          <div className="mx-auto max-w-2xl space-y-3">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-display text-xl font-medium text-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="min-h-[18rem] w-full rounded-[var(--radius)] border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed text-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <p className="font-mono text-xs text-muted">
              Markdown · {contenido.split(/\s+/).filter(Boolean).length} palabras
            </p>
          </div>
        ) : view === "diff" ? (
          <DiffView original={nota.original} revised={version.contenido} />
        ) : (
          <article className="mx-auto max-w-2xl">
            <h3 className="mb-3 font-display text-xl font-medium text-fg">
              {version.titulo}
            </h3>
            <Markdown>{version.contenido}</Markdown>
          </article>
        )}
      </div>

      <div className="border-t border-line/70 p-4">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancelEdit}>
              Cancelar
            </Button>
            <Button onClick={() => onSaveEdit(titulo, contenido)}>
              <Check className="size-4" />
              Guardar cambios
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-2 font-mono text-xs text-muted">
              <span>{palabras} palabras</span>
              <span>{proveedorLabel(version.proveedor)}</span>
              {tokens != null && <span>{tokens} tokens</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="danger" onClick={() => onAction("rechazar")}>
                <X className="size-4" />
                Rechazar
              </Button>
              <Button
                variant="outline"
                onClick={() => onAction("editar")}
                className="ml-auto"
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              <Button onClick={() => onAction("aprobar")}>
                <Check className="size-4" />
                Aprobar versión
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={openImg}
        onClose={() => setOpenImg(false)}
        title="Imagen de la nota"
      >
        <div className="space-y-4">
          <Field label="URL de la imagen">
            <input
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              placeholder="https://…/imagen.jpg"
              className={inputCls}
            />
          </Field>
          {imgUrl.trim() && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl.trim()}
              alt=""
              className="max-h-40 w-full rounded-lg object-cover"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenImg(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSetImagen(imgUrl.trim() || null);
                setOpenImg(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
