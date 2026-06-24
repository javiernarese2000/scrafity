"use client";

import { motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ExternalLink,
  Newspaper,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/cn";

import { PublishDialog } from "@/components/moderacion/publish-dialog";
import { pct, simTone } from "@/components/moderacion/similarity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Toast, useToast } from "@/components/ui/toast";
import {
  eliminarNota,
  setArchivada,
  setCategoria,
  setTags,
} from "@/server/biblioteca";
import { enviarACola } from "@/server/cola";
import { regenerar } from "@/server/curaduria";
import { publicar, type Asignacion } from "@/server/publicar";
import { Galeria } from "./galeria";
import { estadoInfo, type NotaDetalleData } from "./types";

export function NotaDetalle({ data }: { data: NotaDetalleData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [tags, setLocalTags] = useState<string[]>(data.tags);
  const [categoria, setLocalCategoria] = useState(data.categoria ?? "");
  const [archivada, setLocalArchivada] = useState(data.archivada);
  const [nuevoTag, setNuevoTag] = useState("");
  const [verOriginal, setVerOriginal] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [activeV, setActiveV] = useState(0);
  const [pollRegen, setPollRegen] = useState(0);

  // Tras regenerar, refrescamos un rato hasta que aparezca la versión nueva.
  useEffect(() => {
    if (pollRegen <= 0) return;
    if (data.versiones.length > 0) {
      setPollRegen(0);
      return;
    }
    const t = setTimeout(() => {
      router.refresh();
      setPollRegen((n) => n - 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [pollRegen, data.versiones.length, router]);

  const info = estadoInfo(archivada ? "archivada" : data.estado);
  const activa =
    data.versiones[Math.min(activeV, data.versiones.length - 1)] ?? null;

  function doPublicar(asignaciones: Asignacion[]) {
    startTransition(async () => {
      const r = await publicar(data.id, asignaciones);
      setPublishOpen(false);
      if (r.errores.length === 0) {
        show(`Publicada en ${r.publicadas}`);
      } else if (r.publicadas === 0) {
        show(`Falló: ${r.errores[0]!.error}`);
      } else {
        show(`Publicada en ${r.publicadas}, falló en ${r.errores.length}`);
      }
    });
  }

  function doEnviarCola(asignaciones: Asignacion[]) {
    startTransition(async () => {
      await enviarACola(data.id, asignaciones);
      setPublishOpen(false);
      show(`Enviada a la cola (${asignaciones.length})`);
    });
  }

  function commitTags(next: string[]) {
    setLocalTags(next);
    startTransition(() => setTags(data.id, next));
  }
  function addTag() {
    const t = nuevoTag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setNuevoTag("");
    commitTags([...tags, t]);
  }
  function removeTag(t: string) {
    commitTags(tags.filter((x) => x !== t));
  }
  function commitCategoria(valor: string) {
    const v = valor.trim();
    setLocalCategoria(v);
    if (v !== (data.categoria ?? "")) {
      startTransition(() => setCategoria(data.id, v));
      show("Categoría actualizada");
    }
  }

  function toggleArchivar() {
    const next = !archivada;
    setLocalArchivada(next);
    startTransition(() => setArchivada(data.id, next));
    show(next ? "Archivada" : "Desarchivada");
  }

  function doRegenerar() {
    startTransition(async () => {
      await regenerar(data.id);
      show("Regenerando… la nueva versión aparece en unos segundos");
      setPollRegen(10);
    });
  }

  function doEliminar() {
    startTransition(async () => {
      await eliminarNota(data.id);
      router.push("/biblioteca");
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/biblioteca"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Biblioteca
      </Link>

      <div className="mb-4 flex items-center gap-2">
        <Badge tone={info.tone}>{info.label}</Badge>
        <span className="text-sm text-muted">
          {data.nVersiones} {data.nVersiones === 1 ? "versión" : "versiones"}
        </span>
        <div className="ml-auto flex gap-2">
          {data.estado === "en_revision" && (
            <Link href="/moderacion">
              <Button variant="outline" size="sm">
                <Newspaper className="size-4" />
                Ir a moderar
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={doRegenerar}
            disabled={pending}
          >
            <RefreshCw className="size-4" />
            Regenerar
          </Button>
          <Button size="sm" onClick={() => setPublishOpen(true)}>
            <Send className="size-4" />
            Publicar / Republicar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleArchivar}
            disabled={pending}
          >
            {archivada ? (
              <>
                <ArchiveRestore className="size-4" />
                Desarchivar
              </>
            ) : (
              <>
                <Archive className="size-4" />
                Archivar
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={doEliminar}
            disabled={pending}
            aria-label="Eliminar"
          >
            <Trash2 className="size-4 text-danger" />
          </Button>
        </div>
      </div>

      <h1 className="font-display text-3xl font-medium leading-tight text-fg">
        {data.titulo}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>{data.fuente}</span>
        <span>·</span>
        <span>{data.fecha}</span>
        <a
          href={data.urlOriginal}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-brand hover:underline"
        >
          ver original <ExternalLink className="size-3" />
        </a>
      </p>

      {/* Categoría editable (define la columna en la bandeja y la categoría en WP) */}
      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm text-muted">Categoría</label>
        <input
          list="categorias-sugeridas"
          value={categoria}
          onChange={(e) => setLocalCategoria(e.target.value)}
          onBlur={(e) => commitCategoria(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="sin categoría"
          className="rounded-md border border-line bg-surface px-2.5 py-1 text-sm capitalize text-fg focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <datalist id="categorias-sugeridas">
          {[
            "política",
            "economía",
            "deportes",
            "sociedad",
            "tecnología",
            "espectáculos",
            "internacional",
            "policiales",
            "nacionales",
            "salud",
            "cultura",
          ].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Etiquetas */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs text-fg"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              aria-label={`Quitar ${t}`}
              className="text-muted hover:text-danger"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1">
          <input
            value={nuevoTag}
            onChange={(e) => setNuevoTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="agregar tag"
            className="w-24 bg-transparent text-xs text-fg placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            aria-label="Agregar tag"
            className="text-muted hover:text-fg"
          >
            <Plus className="size-3" />
          </button>
        </span>
      </div>

      <Galeria
        articleId={data.id}
        cover={data.imagenUrl}
        imagenes={data.imagenes}
      />

      {data.versiones.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-line py-10 text-center text-sm text-muted">
          Esta nota todavía no tiene versiones generadas.
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-1 border-b border-line">
            {data.versiones.map((v, i) => {
              const activo = activeV === i;
              const sim = simTone(v.similarity);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveV(i)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                    activo ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  V{i + 1}
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: `var(--color-${sim.tone === "neutral" ? "muted" : sim.tone})` }}
                  />
                  {activo && (
                    <motion.span
                      layoutId="vtab"
                      className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {activa && (
            <Card className="mt-4">
              <div className="flex items-center gap-2 border-b border-line/70 px-5 py-3">
                <Badge tone={simTone(activa.similarity).tone}>
                  {pct(activa.similarity)} similar al original
                </Badge>
                <Badge className="ml-auto">{activa.estado}</Badge>
              </div>
              <CardBody>
                <h4 className="font-display text-xl font-medium leading-snug text-fg">
                  {activa.titulo}
                </h4>
                <Markdown className="mt-3">{activa.contenido}</Markdown>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setVerOriginal((v) => !v)}
        className="mt-4 text-sm text-muted hover:text-fg"
      >
        {verOriginal ? "Ocultar original" : "Ver texto original"}
      </button>
      {verOriginal && (
        <Card className="mt-3">
          <CardBody>
            <Markdown className="opacity-80">{data.original}</Markdown>
          </CardBody>
        </Card>
      )}

      {data.versiones.length > 0 && (
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          pending={pending}
          versiones={data.versiones.map((v) => ({
            id: v.id,
            titulo: v.titulo,
          }))}
          covers={[data.imagenUrl, ...data.imagenes].filter(
            (u): u is string => !!u,
          )}
          destinos={data.destinos}
          defaultVersionId={data.versiones[0]!.id}
          onConfirm={doPublicar}
          onQueue={doEnviarCola}
        />
      )}

      <Toast message={message} />
    </div>
  );
}
