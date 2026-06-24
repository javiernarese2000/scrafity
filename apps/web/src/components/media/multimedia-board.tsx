"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { inputCls } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import {
  buscarMedia,
  eliminarMedia,
  setTagsMedia,
  subirMedia,
  type MediaItem,
} from "@/server/media";

export function MultimediaBoard({ inicial }: { inicial: MediaItem[] }) {
  const { message, show } = useToast();
  const [items, setItems] = useState<MediaItem[]>(inicial);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      buscarMedia(q).then((r) => {
        if (active) {
          setItems(r);
          setLoading(false);
        }
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await subirMedia(fd, tags);
      if (res.ok) setItems((prev) => [res.item, ...prev]);
      else show(res.error);
    }
    setUploading(false);
    setTags("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function guardarTags(id: string, valor: string) {
    setItems((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, tags: valor.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) }
          : m,
      ),
    );
    setTagsMedia(id, valor);
  }

  function borrar(m: MediaItem) {
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    eliminarMedia(m.id);
    show("Imagen eliminada");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Multimedia"
        subtitle="Biblioteca global de imágenes. Tagueá para reusarlas como portada en cualquier nota."
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por tag o nombre (ej. messi)…"
            className="h-10 flex-1 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted" />}
        </div>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tags al subir: messi, deportes"
          className={`${inputCls} w-56`}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Subir
        </Button>
      </div>

      <div className="mb-6">
        <Stat label="Imágenes" value={String(items.length)} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="Sin imágenes"
          description="Subí imágenes con tags para reutilizarlas como portada en las notas."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <Card key={m.id} className="group overflow-hidden">
              <div className="relative aspect-video bg-elevated">
                <img src={m.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => borrar(m)}
                  aria-label="Eliminar"
                  className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-surface/90 text-danger opacity-0 transition-opacity hover:bg-surface group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="p-2.5">
                <input
                  defaultValue={m.tags.join(", ")}
                  onBlur={(e) => guardarTags(m.id, e.target.value)}
                  placeholder="tags…"
                  className="w-full rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
