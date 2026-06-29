import { Badge } from "@scrapify/ui/badge";
import {
  ArrowUpRight,
  AtSign,
  CheckCircle2,
  Clapperboard,
  Clock,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { TipsCard } from "@/components/dashboard/tips-card";
import { RedIcon } from "@/components/icons/redes";
import { createClient } from "@/lib/supabase/server";
import { getResumenRedes } from "@/server/dashboard";

/** Primer nombre del usuario (de su metadata o, si no, del email). */
function primerNombre(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const raw =
    typeof meta.nombre === "string" && meta.nombre.trim()
      ? meta.nombre.trim()
      : (user?.email?.split("@")[0] ?? "");
  const p = raw.split(/[\s._-]+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

function saludoHora(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const TONO = {
  brand: { bar: "bg-brand", tint: "bg-brand/12", text: "text-brand" },
  accent: { bar: "bg-accent", tint: "bg-accent/12", text: "text-accent" },
  success: { bar: "bg-success", tint: "bg-success/15", text: "text-success" },
  info: { bar: "bg-info", tint: "bg-info/15", text: "text-info" },
} as const;

function Kpi({
  icon: Icon,
  value,
  label,
  sub,
  tono,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  sub?: string;
  tono: keyof typeof TONO;
}) {
  const t = TONO[tono];
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line/70 bg-surface p-5 shadow-soft">
      <span className={"absolute inset-x-0 top-0 h-1 " + t.bar} />
      <span
        className={"grid size-10 place-items-center rounded-xl " + t.tint}
      >
        <Icon className={"size-5 " + t.text} />
      </span>
      <p className="mt-4 font-mono text-3xl font-medium text-fg">{value}</p>
      <p className="text-sm text-muted">
        {label}
        {sub && <span className="text-muted/70"> · {sub}</span>}
      </p>
    </div>
  );
}

const ESTADOS = [
  { id: "publicada", label: "Publicadas", color: "var(--color-success)" },
  { id: "en_cola", label: "En cola", color: "var(--color-info)" },
  { id: "pendiente", label: "Pendientes", color: "var(--color-muted)" },
  { id: "error", label: "Con error", color: "var(--color-danger)" },
] as const;

const REDES = [
  { id: "instagram", label: "Instagram", color: "#d6336c" },
  { id: "facebook", label: "Facebook", color: "#3b5998" },
  { id: "tiktok", label: "TikTok", color: "#0ea5b7" },
] as const;

const TONE_BADGE: Record<string, "neutral" | "info" | "success" | "danger"> = {
  pendiente: "neutral",
  en_cola: "info",
  publicada: "success",
  error: "danger",
};

const ACCIONES = [
  { href: "/estudio", label: "Crear publicación", desc: "Subí un video y editalo", icon: Clapperboard },
  { href: "/clientes", label: "Clientes", desc: "Administrá tus clientes", icon: Users },
  { href: "/cuentas", label: "Cuentas", desc: "Conectá redes sociales", icon: AtSign },
];

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

export default async function PanelRedes() {
  const sb = await createClient();
  const [r, { data: { user } }] = await Promise.all([
    getResumenRedes(),
    sb.auth.getUser(),
  ]);
  const maxRed = Math.max(1, ...REDES.map((x) => r.porPlataforma[x.id]));
  const nombre = primerNombre(user);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[2.2rem] font-medium tracking-tight text-fg">
            {saludoHora()}
            {nombre ? `, ${nombre}` : ""} 👋
          </h2>
          <p className="mt-1 text-sm text-muted">
            Esto es lo que está pasando con tus videos y redes.
          </p>
        </div>
        <Link
          href="/estudio"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-brand-foreground transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Clapperboard className="size-4" />
          Nueva publicación
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Users} value={r.clientes} label="Clientes" tono="brand" />
        <Kpi
          icon={AtSign}
          value={r.cuentasConectadas}
          label="Cuentas conectadas"
          sub={`de ${r.cuentas}`}
          tono="accent"
        />
        <Kpi
          icon={CheckCircle2}
          value={r.porEstado.publicada}
          label="Publicadas"
          tono="success"
        />
        <Kpi
          icon={Clock}
          value={r.porEstado.en_cola + r.porEstado.pendiente}
          label="En cola / pendientes"
          tono="info"
        />
      </div>

      {/* Estado + Por red */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface p-5 shadow-soft">
          <p className="mb-4 text-sm font-medium text-fg">
            Estado de publicaciones
          </p>
          <div className="space-y-3.5">
            {ESTADOS.map((e) => {
              const n = r.porEstado[e.id];
              const pct = r.totalPubs ? (n / r.totalPubs) * 100 : 0;
              return (
                <div key={e.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted">{e.label}</span>
                    <span className="font-mono text-fg">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: e.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface p-5 shadow-soft">
          <p className="mb-4 text-sm font-medium text-fg">Distribución por red</p>
          <div className="space-y-3.5">
            {REDES.map((red) => {
              const n = r.porPlataforma[red.id];
              const pct = (n / maxRed) * 100;
              return (
                <div key={red.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted">
                      <RedIcon plataforma={red.id} className="size-4" />
                      {red.label}
                    </span>
                    <span className="font-mono text-fg">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: red.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actividad reciente + Tips + Accesos directos (3 columnas) */}
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_280px]">
        <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-fg">Actividad reciente</p>
            <Link
              href="/publicaciones"
              className="text-xs font-medium text-accent hover:underline"
            >
              Ver todo
            </Link>
          </div>

          {r.recientes.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="grid size-12 place-items-center rounded-2xl border border-line bg-elevated text-muted">
                <Send className="size-5" />
              </span>
              <p className="mt-3 text-sm text-muted">
                Todavía no hay publicaciones.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line/70">
              {r.recientes.map((p) => {
                const red = REDES.find((x) => x.id === p.plataforma);
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <RedIcon plataforma={p.plataforma} className="size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">
                        {p.videoTitulo || "Video"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {p.clienteNombre} · {red?.label}
                      </p>
                    </div>
                    <span className="hidden text-xs text-muted sm:block">
                      {fmt(p.fecha)}
                    </span>
                    <Badge tone={TONE_BADGE[p.estado]}>{p.estado}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tips rotativos */}
        <TipsCard />

        <div className="space-y-3 self-start">
          {ACCIONES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-line/70 bg-surface p-4 shadow-soft transition-shadow hover:shadow-float"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-elevated text-accent">
                <a.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{a.label}</p>
                <p className="truncate text-xs text-muted">{a.desc}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
