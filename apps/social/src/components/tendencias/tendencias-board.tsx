"use client";

import { PageHeader } from "@scrapify/ui/page-header";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ArrowUpRight,
  Clapperboard,
  ExternalLink,
  Flame,
  Hash,
  Music,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { RedIcon } from "@/components/icons/redes";
import { REGIONES, type Tendencia } from "@/lib/tendencias";
import { getTendencias } from "@/server/tendencias";

const CC = "https://ads.tiktok.com/business/creativecenter/inspiration/popular";

/** Links al Creative Center oficial de TikTok, por región. */
function tiktokLinks(geo: string) {
  return [
    {
      icon: Hash,
      titulo: "Hashtags en tendencia",
      desc: "Los hashtags que más crecen ahora mismo en TikTok.",
      url: `${CC}/hashtag/pc/en?region=${geo}`,
    },
    {
      icon: Music,
      titulo: "Sonidos en tendencia",
      desc: "Audios y canciones que están explotando. Usá uno y sumás alcance.",
      url: `${CC}/music/pc/en?region=${geo}`,
    },
    {
      icon: Flame,
      titulo: "Creadores y videos top",
      desc: "Qué formatos y creadores están pegando en tu país.",
      url: `https://ads.tiktok.com/business/creativecenter/inspiration/popular/creator/pc/en?region=${geo}`,
    },
  ];
}

/** Número que cuenta hacia arriba al aparecer. */
function CountUp({ to }: { to: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("es-AR"));
  const [txt, setTxt] = useState("0");
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1, ease: "easeOut" });
    const unsub = rounded.on("change", setTxt);
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, mv, rounded]);
  return <>{txt}</>;
}

const RANK_STYLE = [
  "bg-gradient-to-br from-amber-300 to-accent text-brand-foreground shadow-[0_6px_20px_-4px_var(--color-accent)]",
  "bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-900",
  "bg-gradient-to-br from-amber-700 to-amber-600 text-white",
];

export function TendenciasBoard({
  inicial,
  geoInicial,
}: {
  inicial: Tendencia[];
  geoInicial: string;
}) {
  const [geo, setGeo] = useState(geoInicial);
  const [rows, setRows] = useState<Tendencia[]>(inicial);
  const [pending, startTransition] = useTransition();
  const [actualizado, setActualizado] = useState<Date>(new Date());
  const [vista, setVista] = useState<"google" | "tiktok">("google");

  const max = Math.max(1, ...rows.map((r) => r.trafficNum));

  function cargar(g: string) {
    startTransition(async () => {
      const data = await getTendencias(g);
      setRows(data);
      setActualizado(new Date());
    });
  }

  function cambiarRegion(g: string) {
    setGeo(g);
    cargar(g);
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Tendencias"
        subtitle="Lo que la gente está buscando ahora mismo. Inspiración para tu próximo video."
        action={
          <button
            type="button"
            onClick={() => cargar(geo)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted hover:bg-elevated hover:text-fg disabled:opacity-50"
          >
            <RefreshCw className={"size-3.5 " + (pending ? "animate-spin" : "")} />
            Actualizar
          </button>
        }
      />

      {/* Tabs de fuente */}
      <div className="mb-4 inline-flex rounded-lg border border-line bg-surface p-0.5">
        <button
          type="button"
          onClick={() => setVista("google")}
          className={
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
            (vista === "google" ? "bg-elevated text-fg" : "text-muted hover:text-fg")
          }
        >
          <Search className="size-3.5" />
          Búsquedas (Google)
        </button>
        <button
          type="button"
          onClick={() => setVista("tiktok")}
          className={
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
            (vista === "tiktok" ? "bg-elevated text-fg" : "text-muted hover:text-fg")
          }
        >
          <RedIcon plataforma="tiktok" className="size-3.5" />
          TikTok
        </button>
      </div>

      {/* Fuente + región */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {REGIONES.map((r) => {
            const on = r.id === geo;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => cambiarRegion(r.id)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (on
                    ? "border-accent bg-accent/10 text-fg"
                    : "border-line text-muted hover:bg-elevated hover:text-fg")
                }
              >
                <span>{r.flag}</span>
                {r.label}
              </button>
            );
          })}
        </div>
        {vista === "google" && (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Google Trends · en vivo
            </span>
            <span className="hidden sm:inline">
              {actualizado.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {vista === "google" ? (
        rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface py-16 text-center text-sm text-muted shadow-soft">
          {pending ? "Buscando tendencias…" : "No se pudieron traer las tendencias ahora. Probá actualizar."}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={geo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {rows.map((t, i) => {
              const pct = (t.trafficNum / max) * 100;
              const top3 = t.rank <= 3;
              return (
                <motion.div
                  key={t.rank + t.termino}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className={
                    "group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-lg)] border bg-surface p-3.5 shadow-soft transition-shadow hover:shadow-float " +
                    (top3 ? "border-accent/30" : "border-line/70")
                  }
                >
                  {/* Rank */}
                  <span
                    className={
                      "grid size-11 shrink-0 place-items-center rounded-xl font-display text-lg font-semibold " +
                      (top3 ? RANK_STYLE[t.rank - 1] : "bg-elevated text-muted")
                    }
                  >
                    {t.rank}
                  </span>

                  {/* Contenido */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-[17px] font-medium capitalize text-fg">
                        {t.termino}
                      </p>
                      {top3 && (
                        <Flame className="size-4 shrink-0 text-accent" fill="currentColor" />
                      )}
                    </div>

                    {/* Barra de volumen animada */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.05 + 0.15, duration: 0.7, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent"
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-muted">
                        <CountUp to={t.trafficNum} />+ búsquedas
                      </span>
                    </div>

                    {/* Noticia relacionada */}
                    {t.noticia && (
                      <a
                        href={t.noticia.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-muted hover:text-fg"
                      >
                        {t.noticia.fuente && (
                          <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium">
                            {t.noticia.fuente}
                          </span>
                        )}
                        <span className="truncate">{t.noticia.titulo}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    )}
                  </div>

                  {/* Miniatura */}
                  {t.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.imagen}
                      alt=""
                      className="hidden size-14 shrink-0 rounded-lg object-cover sm:block"
                    />
                  )}

                  {/* CTA */}
                  <Link
                    href="/estudio"
                    title="Crear un video sobre este tema"
                    className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-brand-foreground transition-all hover:opacity-90 active:scale-95 lg:inline-flex"
                  >
                    <Clapperboard className="size-3.5" />
                    Crear video
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tiktokLinks(geo).map((c) => (
            <a
              key={c.titulo}
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-line/70 bg-surface p-5 shadow-soft transition-shadow hover:shadow-float"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-accent/15 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-elevated text-accent">
                  <c.icon className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="relative mt-4 font-display text-lg font-medium text-fg">
                {c.titulo}
              </p>
              <p className="relative mt-1 text-sm text-muted">{c.desc}</p>
              <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                <RedIcon plataforma="tiktok" className="size-3.5" />
                Ver en Creative Center
              </span>
            </a>
          ))}
        </div>
      )}

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <TrendingUp className="size-3.5" />
        {vista === "google"
          ? "Las tendencias de TikTok suelen cruzar a Reels 1–2 días después — ideá tu contenido con esto."
          : "Abre el Creative Center oficial de TikTok (gratis), ya filtrado por tu país."}
      </p>
    </div>
  );
}
