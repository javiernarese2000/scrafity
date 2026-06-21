import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { AreaTrend } from "@/components/charts/area-trend";
import { Donut } from "@/components/charts/donut";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import {
  actividad,
  costoProveedor,
  estados,
  fuentes,
  kpis,
  trend,
} from "@/data/mock";

const fuenteTono = {
  activa: "success",
  lenta: "warning",
  error: "danger",
} as const;

const fuenteColor = {
  activa: "var(--color-success)",
  lenta: "var(--color-warning)",
  error: "var(--color-danger)",
} as const;

const accionColor = {
  aprobó: "text-success",
  publicó: "text-brand",
  editó: "text-accent",
  rechazó: "text-danger",
} as const;

export default function DashboardPage() {
  const costoMax = Math.max(...costoProveedor.map((c) => c.costo));
  const costoTotal = costoProveedor.reduce((a, c) => a + c.costo, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Viernes 21 de junio
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-fg">
            Buen día, Javier
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tenés <span className="font-medium text-fg">23 notas</span> esperando
            moderación.
          </p>
        </div>
        <Link href="/pegar">
          <Button>
            Pegar URL
            <ArrowUpRight className="size-4" />
          </Button>
        </Link>
      </Reveal>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          <MetricCard
            key="1"
            label="Ingestadas hoy"
            value={String(kpis.ingestadasHoy)}
            delta="12%"
            trend="up"
          />,
          <MetricCard
            key="2"
            label="En revisión"
            value={String(kpis.enRevision)}
            hint="pendientes"
          />,
          <MetricCard
            key="3"
            label="Publicadas hoy"
            value={String(kpis.publicadasHoy)}
            delta="5%"
            trend="up"
          />,
          <MetricCard
            key="4"
            label="Costo IA hoy"
            value={`$${kpis.costoHoy.toFixed(2)}`}
            delta="3%"
            trend="down"
          />,
          <MetricCard
            key="5"
            label="Similitud media"
            value={`${Math.round(kpis.similitudMedia * 100)}%`}
            hint="bajo riesgo"
          />,
        ].map((card, i) => (
          <Reveal key={i} delay={0.04 * i}>
            {card}
          </Reveal>
        ))}
      </div>

      {/* Tendencia + estados */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal delay={0.1} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Notas por día</CardTitle>
              <Badge>Últimos 14 días</Badge>
            </CardHeader>
            <CardBody>
              <AreaTrend data={trend} />
            </CardBody>
          </Card>
        </Reveal>
        <Reveal delay={0.15}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Versiones por estado</CardTitle>
            </CardHeader>
            <CardBody>
              <Donut data={estados} />
            </CardBody>
          </Card>
        </Reveal>
      </div>

      {/* Costo + fuentes + actividad */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal delay={0.2}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Costo de IA por proveedor</CardTitle>
              <span className="font-mono text-sm font-medium text-fg">
                ${costoTotal.toFixed(2)}
              </span>
            </CardHeader>
            <CardBody className="space-y-4">
              {costoProveedor.map((c) => (
                <div key={c.proveedor}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{c.proveedor}</span>
                    <span className="font-mono font-medium text-fg">
                      ${c.costo.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.costo / costoMax) * 100}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">Últimos 7 días</p>
            </CardBody>
          </Card>
        </Reveal>

        <Reveal delay={0.25}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Salud de fuentes</CardTitle>
              <Badge tone="success">{fuentes.length} activas</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {fuentes.map((f) => (
                <div key={f.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: fuenteColor[f.estado] }}
                  />
                  <span className="font-medium text-fg">{f.nombre}</span>
                  <Badge tone={fuenteTono[f.estado]} className="ml-auto">
                    {f.tipo}
                  </Badge>
                  <span className="w-20 text-right text-xs text-muted">
                    {f.ultimaLectura}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </Reveal>

        <Reveal delay={0.3}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {actividad.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-medium text-brand">
                    {a.iniciales}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-fg">
                      <span className="font-medium">{a.usuario}</span>{" "}
                      <span className={accionColor[a.accion]}>{a.accion}</span>{" "}
                      <span className="text-muted">«{a.nota}»</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{a.cuando}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
