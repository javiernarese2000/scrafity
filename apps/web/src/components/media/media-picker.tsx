"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal, inputCls } from "@/components/ui/modal";
import { buscarMedia, subirMedia, type MediaItem } from "@/server/media";

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [q, open]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await subirMedia(fd, tags);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    setTags("");
    if (res.ok) setItems((prev) => [res.item, ...prev]);
  }

  return (
    <Modal open={open} onClose={onClose} title="Elegir imagen">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por tag o nombre (ej. messi)…"
            autoFocus
            className="h-10 flex-1 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted" />}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags para la nueva imagen (coma): messi, deportes"
              className={inputCls}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
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

        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {loading ? "Buscando…" : "No hay imágenes. Subí una con tags para reutilizarla."}
          </p>
        ) : (
          <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m.url);
                  onClose();
                }}
                title={m.tags.join(", ")}
                className="group relative aspect-square overflow-hidden rounded-[var(--radius)] border border-line transition-colors hover:border-brand"
              >
                <img src={m.url} alt="" className="size-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-left text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {m.tags.length ? m.tags.join(", ") : m.nombre}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
