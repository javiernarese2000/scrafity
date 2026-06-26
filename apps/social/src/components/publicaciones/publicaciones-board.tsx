"use client";

import { Badge } from "@scrapify/ui/badge";
import { Card, CardBody } from "@scrapify/ui/card";
import { PageHeader } from "@scrapify/ui/page-header";
import { ExternalLink, Send } from "lucide-react";
import { useMemo, useState } from "react";

import type { Plataforma } from "@/server/cuentas";
import type { EstadoPub, PublicacionRow } from "@/server/publicaciones";

const COLOR_PLAT: Record<Plataforma, string> = {
  instagram: "#d6336c",
  facebook: "#3b5998",
  tiktok: "#111111",
};
const LABEL_PLAT: Record<Plataforma, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const ESTADOS: { id: EstadoPub; label: string; tone: "neutral" | "info" | "success" | "danger" }[] = [
  { id: "pendiente", label: "Pendiente", tone: "neutral" },
  { id: "en_cola", label: "En cola", tone: "info" },
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
  const [cliente, setCliente] = useState("todos");
  const [plataforma, setPlataforma] = useState<"todas" | Plataforma>("todas");
  const [estado, setEstado] = useState<"todos" | EstadoPub>("todos");

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
      publicada: 0,
      error: 0,
    };
    publicaciones.forEach((p) => (c[p.estado] += 1));
    return c;
  }, [publicaciones]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Publicaciones"
        subtitle="Historial y estado de lo que sale a las redes."
      />

      {/* Métricas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_PLAT[p.plataforma] }}
                    title={LABEL_PLAT[p.plataforma]}
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
    </div>
  );
}
