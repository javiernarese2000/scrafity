"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ExternalLink,
  Newspaper,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Toast, useToast } from "@/components/ui/toast";
import { setArchivada, setTags } from "@/server/biblioteca";
import { Galeria } from "./galeria";
import { estadoInfo, type NotaDetalleData } from "./types";

export function NotaDetalle({ data }: { data: NotaDetalleData }) {
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [tags, setLocalTags] = useState<string[]>(data.tags);
  const [archivada, setLocalArchivada] = useState(data.archivada);
  const [nuevoTag, setNuevoTag] = useState("");
  const [verOriginal, setVerOriginal] = useState(false);

  const info = estadoInfo(archivada ? "archivada" : data.estado);

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
  function toggleArchivar() {
    const next = !archivada;
    setLocalArchivada(next);
    startTransition(() => setArchivada(data.id, next));
    show(next ? "Archivada" : "Desarchivada");
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

      <Card className="mt-6">
        <CardBody>
          <Markdown>{data.contenido}</Markdown>
        </CardBody>
      </Card>

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

      <Toast message={message} />
    </div>
  );
}
