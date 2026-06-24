"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Library, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { quitarImagen, setPortada, subirImagen, usarEnNota } from "@/server/imagenes";

export function Galeria({
  articleId,
  cover: coverProp,
  imagenes: imgsProp,
}: {
  articleId: string;
  cover: string | null;
  imagenes: string[];
}) {
  const [cover, setCover] = useState<string | null>(coverProp);
  const [imgs, setImgs] = useState<string[]>(imgsProp);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const { message, show } = useToast();

  function elegirDeBiblioteca(url: string) {
    setImgs((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setCover(url);
    startTransition(() => usarEnNota(articleId, url));
    show("Portada actualizada");
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await subirImagen(articleId, fd);
      if (res.ok) {
        setImgs((prev) => [...prev, res.url]);
        setCover((c) => c ?? res.url);
      } else {
        show(res.error);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function usarPortada(url: string) {
    setCover(url);
    startTransition(() => setPortada(articleId, url));
    show("Portada actualizada");
  }

  function quitar(url: string) {
    setImgs((prev) => prev.filter((u) => u !== url));
    if (cover === url) setCover(null);
    startTransition(() => quitarImagen(articleId, url));
  }

  // Todas las portadas disponibles: la por defecto (extraída del original) + las subidas.
  const todas = [...new Set([...(cover ? [cover] : []), ...imgs])];
  const preview = cover ?? todas[0] ?? null;
  const subidas = new Set(imgs);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-fg">Portada</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <Library className="size-4" />
            Biblioteca
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Subir
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {!preview ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-line py-10 text-sm text-muted transition-colors hover:bg-elevated/50"
        >
          <ImagePlus className="size-6" />
          Esta nota no trajo imagen. Subí una para usar de portada.
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line">
            <img
              src={preview}
              alt=""
              className="aspect-[16/7] w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              Portada actual
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {todas.map((url) => (
              <div
                key={url}
                className={cn(
                  "group relative aspect-video overflow-hidden rounded-[var(--radius)] border",
                  cover === url
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-line",
                )}
              >
                <button
                  type="button"
                  onClick={() => usarPortada(url)}
                  className="block size-full"
                  aria-label="Usar de portada"
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
                {!subidas.has(url) && (
                  <span className="absolute left-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">
                    original
                  </span>
                )}
                {subidas.has(url) && (
                  <button
                    type="button"
                    onClick={() => quitar(url)}
                    aria-label="Quitar imagen"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-surface text-danger opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Clic en una miniatura para usarla de portada. La marcada con
            “original” es la que vino de la fuente.
          </p>
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={elegirDeBiblioteca}
      />

      <Toast message={message} />
    </div>
  );
}
