"use client";

import { Badge } from "@scrapify/ui/badge";
import { Button } from "@scrapify/ui/button";
import { Card, CardBody } from "@scrapify/ui/card";
import { PageHeader } from "@scrapify/ui/page-header";
import { Toast, useToast } from "@scrapify/ui/toast";
import { ExternalLink, RotateCcw, Send, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { RedIcon } from "@/components/icons/redes";
import type { Plataforma } from "@/server/cuentas";
import { despachar, publicarYa } from "@/server/despachador";
import type { EstadoPub, PublicacionRow } from "@/server/publicaciones";

const LABEL_PLAT: Record<Plataforma, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const ESTADOS: { id: EstadoPub; label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }[] = [
  { id: "pendiente", label: "Pendiente", tone: "neutral" },
  { id: "en_cola", label: "En cola", tone: "info" },
  { id: "publicando", label: "Publicando…", tone: "warning" },
  { id: "publicada", label: "Publicada", tone: "success" },
  { id: "error", label: "Error", tone: "danger" },
];

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PublicacionesBoard({
  publicaciones,
}: {
  publicaciones: PublicacionRow[];
}) {
  const router = useRouter();
  const { message, show } = useToast();
  const [pending, startTransition] = useTransition();
  const [cliente, setCliente] = useState("todos");
  const [plataforma, setPlataforma] = useState<"todas" | Plataforma>("todas");
  const [estado, setEstado] = useState<"todos" | EstadoPub>("todos");

  const enCola = useMemo(
    () => publicaciones.filter((p) => p.estado === "en_cola").length,
    [publicaciones],
  );

  // Despacho automático (mientras el panel está abierto): cada 60s suelta las
  // programadas vencidas. Para 24/7 sin panel, va un cron a /api/cron/despachar.
  const [auto, setAuto] = useState(false);
  const firing = useRef(false);

  useEffect(() => {
    setAuto(localStorage.getItem("redes-auto-despacho") === "1");
  }, []);

  function toggleAuto() {
    setAuto((a) => {
      localStorage.setItem("redes-auto-despacho", a ? "0" : "1");
      return !a;
    });
  }

  useEffect(() => {
    if (!auto) return;
    const tick = async () => {
      if (firing.current) return;
      firing.current = true;
      try {
        const r = await despachar();
        if (r.publicadas > 0) {
          show(`${r.publicadas} publicada(s) automáticamente`);
          router.refresh();
        }
      } catch {
        // un fallo puntual no debe cortar el loop
      } finally {
        firing.current = false;
      }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [auto, show, router]);

  function publicar(id: string) {
    startTransition(async () => {
      const r = await publicarYa(id);
      router.refresh();
      show(r.ok ? "Publicado" : `No se pudo: ${r.error ?? ""}`);
    });
  }

  function despacharPendientes() {
    startTransition(async () => {
      const r = await despachar();
      router.refresh();
      show(
        r.publicadas > 0 || r.errores.length === 0
          ? `${r.publicadas} publicada(s)${r.errores.length ? `, ${r.errores.length} con error` : ""}`
          : `No se publicó nada: ${r.errores[0] ?? ""}`,
      );
    });
  }

  const clientesUnicos = useMemo(() => {
    const m = new Map<string, string>();
    publicaciones.forEach((p) => m.set(p.clienteId, p.clienteNombre));
    return [...m.entries()];
  }, [publicaciones]);

  const filtradas = publicaciones.filter(
    (p) =>
      (cliente === "todos" || p.clienteId === cliente) &&
      (plataforma === "todas" || p.plataforma === plataforma) &&
      (estado === "todos" || p.estado === estado),
  );

  const conteo = useMemo(() => {
    const c: Record<EstadoPub, number> = {
      pendiente: 0,
      en_cola: 0,
      publicando: 0,
      publicada: 0,
      error: 0,
    };
    publicaciones.forEach((p) => (c[p.estado] += 1));
    return c;
  }, [publicaciones]);

  return (
    <div className="w-full">
      <PageHeader
        title="Publicaciones"
        subtitle="Historial y estado de lo que sale a las redes."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAuto}
              title="Despacha solo las programadas vencidas cada 60s (mientras el panel está abierto)"
              className={
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                (auto
                  ? "border-success/40 bg-success/10 text-fg"
                  : "border-line text-muted hover:bg-elevated hover:text-fg")
              }
            >
              <span className="relative flex size-2">
                {auto && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
                )}
                <span
                  className={
                    "relative inline-flex size-2 rounded-full " +
                    (auto ? "bg-success" : "bg-muted/50")
                  }
                />
              </span>
              Auto {auto ? "ON" : "OFF"}
            </button>
            {enCola > 0 && (
              <Button onClick={despacharPendientes} disabled={pending}>
                <Send className="size-4" />
                {pending ? "Publicando…" : `Despachar pendientes (${enCola})`}
              </Button>
            )}
          </div>
        }
      />

      {/* Métricas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ESTADOS.map((e) => (
          <Card key={e.id}>
            <CardBody className="py-4">
              <p className="font-mono text-2xl font-medium text-fg">
                {conteo[e.id]}
              </p>
              <p className="mt-0.5 text-xs text-muted">{e.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="todos">Todos los clientes</option>
          {clientesUnicos.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={plataforma}
          onChange={(e) => setPlataforma(e.target.value as "todas" | Plataforma)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="todas">Todas las redes</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="tiktok">TikTok</option>
        </select>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as "todos" | EstadoPub)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {/* Listado */}
      {filtradas.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-elevated text-muted">
              <Send className="size-6" />
            </span>
            <p className="mt-4 font-display text-lg font-medium text-fg">
              {publicaciones.length === 0
                ? "Todavía no hay publicaciones"
                : "Nada con esos filtros"}
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              {publicaciones.length === 0
                ? "Cuando mandes un video a render y se publique, va a aparecer acá."
                : "Probá cambiar cliente, red o estado."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((p) => {
            const tone =
              ESTADOS.find((e) => e.id === p.estado)?.tone ?? "neutral";
            return (
              <Card key={p.id}>
                <CardBody className="flex items-center gap-3 py-3">
                  <RedIcon
                    plataforma={p.plataforma}
                    className="size-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {p.videoTitulo || "Video"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {p.clienteNombre} · {LABEL_PLAT[p.plataforma]}
                      {p.caption ? ` · ${p.caption}` : ""}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted sm:block">
                    {fmt(p.publicadaEn ?? p.createdAt)}
                  </span>
                  <Badge tone={tone}>
                    {ESTADOS.find((e) => e.id === p.estado)?.label}
                  </Badge>
                  {(p.estado === "en_cola" || p.estado === "error") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => publicar(p.id)}
                      disabled={pending}
                    >
                      {p.estado === "error" ? (
                        <>
                          <RotateCcw className="size-3.5" />
                          Reintentar
                        </>
                      ) : (
                        <>
                          <Zap className="size-3.5" />
                          Publicar ahora
                        </>
                      )}
                    </Button>
                  )}
                  {p.urlPublicada && (
                    <a
                      href={p.urlPublicada}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ver publicación"
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
