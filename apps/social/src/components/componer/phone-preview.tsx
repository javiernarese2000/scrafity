"use client";

import {
  Bookmark,
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music,
  Plus,
  Search,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";

import { RedIcon } from "@/components/icons/redes";
import type { Plataforma } from "@/server/cuentas";

export type PreviewData = {
  plataforma: Plataforma;
  videoUrl: string | null;
  tipo?: string; // "video" | "imagen"
  handle: string; // @usuario o nombre de la cuenta
  cliente: string;
  caption: string;
};

/** Iniciales para el avatar cuando no hay foto. */
function iniciales(s: string) {
  return (
    s
      .replace(/^@/, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "•"
  );
}

function Avatar({ name, ring }: { name: string; ring?: boolean }) {
  return (
    <span
      className={
        "grid place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-[11px] font-bold text-white " +
        (ring ? "ring-2 ring-white" : "")
      }
      style={{ width: "100%", height: "100%" }}
    >
      {iniciales(name)}
    </span>
  );
}

function Video({
  url,
  cover = true,
  tipo = "video",
}: {
  url: string | null;
  cover?: boolean;
  tipo?: string;
}) {
  if (!url) {
    return (
      <div className="grid h-full w-full place-items-center bg-neutral-900 text-neutral-600">
        <span className="text-xs">Sin medio</span>
      </div>
    );
  }
  const cls = "h-full w-full " + (cover ? "object-cover" : "object-contain");
  if (tipo === "imagen") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img key={url} src={url} alt="" className={cls} />;
  }
  return (
    <video key={url} src={url} muted loop autoPlay playsInline className={cls} />
  );
}

/** Caption con @handle adelante, recortado a 2 líneas como en la app real. */
function CaptionLinea({ handle, caption }: { handle: string; caption: string }) {
  return (
    <p className="line-clamp-2 text-[11px] leading-snug text-white/95">
      <span className="font-semibold">@{handle.replace(/^@/, "")}</span>{" "}
      {caption || <span className="text-white/50">Tu texto va a aparecer acá…</span>}
    </p>
  );
}

/** Columna de acciones vertical (TikTok / Reels). */
function RailAccion({
  icon: Icon,
  label,
  fill,
}: {
  icon: typeof Heart;
  label?: string;
  fill?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-white">
      <Icon
        className="size-7 drop-shadow"
        fill={fill ? "currentColor" : "none"}
        strokeWidth={1.8}
      />
      {label && <span className="text-[10px] font-medium drop-shadow">{label}</span>}
    </div>
  );
}

// ───────────────────────── Skins ─────────────────────────

function TikTokSkin(d: PreviewData) {
  return (
    <div className="relative h-full w-full bg-black">
      <Video url={d.videoUrl} tipo={d.tipo} />
      {/* Top */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-4 px-4 pt-3 text-[12px] font-medium text-white/80">
        <span>Siguiendo</span>
        <span className="font-bold text-white">
          Para ti
          <span className="mx-auto mt-0.5 block h-0.5 w-5 rounded-full bg-white" />
        </span>
        <Search className="absolute right-3 size-5 text-white" />
      </div>
      {/* Rail derecho */}
      <div className="absolute bottom-24 right-2.5 flex flex-col items-center gap-4">
        <div className="relative size-11">
          <Avatar name={d.handle} />
          <span className="absolute -bottom-1.5 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-rose-500 text-white">
            <Plus className="size-3" strokeWidth={3} />
          </span>
        </div>
        <RailAccion icon={Heart} label="128K" fill />
        <RailAccion icon={MessageCircle} label="1.2K" />
        <RailAccion icon={Bookmark} label="9.8K" />
        <RailAccion icon={Share2} label="Compartir" />
        <span className="mt-1 grid size-9 place-items-center rounded-full bg-neutral-800/80">
          <Music className="size-4 animate-spin text-white [animation-duration:4s]" />
        </span>
      </div>
      {/* Caption abajo izq */}
      <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/70 to-transparent p-3 pr-16 pt-10">
        <p className="text-[13px] font-bold text-white drop-shadow">
          @{d.handle.replace(/^@/, "")}
        </p>
        <p className="line-clamp-3 text-[11px] leading-snug text-white/95 drop-shadow">
          {d.caption || (
            <span className="text-white/50">Tu texto va a aparecer acá…</span>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-white/90">
          <Music className="size-3" /> Audio original — {d.cliente}
        </p>
      </div>
    </div>
  );
}

function ReelSkin(d: PreviewData) {
  return (
    <div className="relative h-full w-full bg-black">
      <Video url={d.videoUrl} tipo={d.tipo} />
      {/* Top */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-white">
        <span className="text-[15px] font-semibold drop-shadow">Reels</span>
        <RedIcon plataforma="instagram" className="size-5 drop-shadow" />
      </div>
      {/* Rail derecho */}
      <div className="absolute bottom-20 right-2.5 flex flex-col items-center gap-4 text-white">
        <RailAccion icon={Heart} label="84.2K" fill />
        <RailAccion icon={MessageCircle} label="932" />
        <RailAccion icon={Send} label="Enviar" />
        <MoreHorizontal className="size-6 drop-shadow" />
        <span className="mt-1 size-7 overflow-hidden rounded-md border border-white/70">
          <Avatar name={d.handle} />
        </span>
      </div>
      {/* Caption abajo */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/65 to-transparent p-3 pr-14 pt-10">
        <div className="flex items-center gap-2">
          <span className="size-7 overflow-hidden rounded-full ring-1 ring-white/80">
            <Avatar name={d.handle} />
          </span>
          <span className="text-[12px] font-semibold text-white drop-shadow">
            {d.handle.replace(/^@/, "")}
          </span>
          <span className="rounded-md border border-white/60 px-1.5 py-px text-[10px] font-medium text-white">
            Seguir
          </span>
        </div>
        <CaptionLinea handle={d.handle} caption={d.caption} />
        <p className="flex items-center gap-1.5 text-[11px] text-white/90">
          <Music className="size-3" /> Audio original
        </p>
      </div>
    </div>
  );
}

function FeedSkin(d: PreviewData) {
  return (
    <div className="flex h-full w-full flex-col bg-neutral-100 dark:bg-neutral-900">
      {/* Barra app */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-[18px] font-bold text-[#1877F2]">facebook</span>
        <span className="flex gap-2 text-neutral-500">
          <Search className="size-4" />
          <MessageCircle className="size-4" />
        </span>
      </div>
      {/* Card */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-800">
        <div className="flex items-center gap-2.5 p-3">
          <span className="size-9 overflow-hidden rounded-full">
            <Avatar name={d.cliente} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-white">
              {d.cliente}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-neutral-500">
              Justo ahora · <Globe className="size-3" />
            </p>
          </div>
          <MoreHorizontal className="size-5 text-neutral-500" />
        </div>
        {d.caption ? (
          <p className="px-3 pb-2.5 text-[13px] leading-snug text-neutral-900 dark:text-neutral-100">
            {d.caption}
          </p>
        ) : (
          <p className="px-3 pb-2.5 text-[13px] italic text-neutral-400">
            Tu texto va a aparecer acá…
          </p>
        )}
        <div className="aspect-square w-full bg-black">
          <Video url={d.videoUrl} tipo={d.tipo} />
        </div>
        {/* Reacciones */}
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="grid size-4 place-items-center rounded-full bg-[#1877F2] text-white">
              <ThumbsUp className="size-2.5" fill="currentColor" />
            </span>
            1.4K
          </span>
          <span>312 comentarios · 88 veces compartido</span>
        </div>
        <div className="grid grid-cols-3 border-t border-neutral-200 py-1 text-[12px] font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          <span className="flex items-center justify-center gap-1.5 py-1">
            <ThumbsUp className="size-4" /> Me gusta
          </span>
          <span className="flex items-center justify-center gap-1.5 py-1">
            <MessageCircle className="size-4" /> Comentar
          </span>
          <span className="flex items-center justify-center gap-1.5 py-1">
            <Share2 className="size-4" /> Compartir
          </span>
        </div>
      </div>
    </div>
  );
}

/** El teléfono con la skin de la red elegida para previsualizar. */
export function PhonePreview(d: PreviewData) {
  const Skin =
    d.plataforma === "tiktok"
      ? TikTokSkin
      : d.plataforma === "instagram"
        ? ReelSkin
        : FeedSkin;

  return (
    <div className="relative aspect-[9/19.5] h-full max-h-full rounded-[2.2rem] border-[6px] border-neutral-950 bg-black shadow-2xl ring-1 ring-white/10">
      {/* Notch */}
      <div className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-950" />
      <div className="h-full w-full overflow-hidden rounded-[1.7rem]">
        <Skin {...d} />
      </div>
    </div>
  );
}
