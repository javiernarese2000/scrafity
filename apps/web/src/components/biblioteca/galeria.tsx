"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { quitarImagen, setPortada, subirImagen } from "@/server/imagenes";

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
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const { message, show } = useToast();

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

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-fg">Galería de portadas</p>
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {imgs.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-line py-10 text-sm text-muted transition-colors hover:bg-elevated/50"
        >
          <ImagePlus className="size-6" />
          Subí imágenes para usarlas como portada
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {imgs.map((url) => (
            <div
              key={url}
              className={cn(
                "group relative aspect-video overflow-hidden rounded-[var(--radius)] border",
                cover === url
                  ? "border-brand ring-2 ring-brand/30"
                  : "border-line",
              )}
            >
              <img src={url} alt="" className="size-full object-cover" />
              {cover === url && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-medium text-brand-foreground">
                  Portada
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                {cover !== url && (
                  <button
                    type="button"
                    onClick={() => usarPortada(url)}
                    className="rounded-md bg-surface px-2 py-1 text-xs font-medium text-fg"
                  >
                    Usar de portada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => quitar(url)}
                  aria-label="Quitar imagen"
                  className="grid size-7 place-items-center rounded-md bg-surface text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
