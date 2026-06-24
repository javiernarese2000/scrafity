import {
  articles,
  db,
  escenarios,
  publications,
  sources,
  versions,
} from "@scrapify/db";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import {
  ArrowUpRight,
  CheckCircle2,
  DownloadCloud,
  Inbox,
  Newspaper,
  SendHorizontal,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Donut } from "@/components/charts/donut";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Pulso, type Bucket } from "@/components/dashboard/pulso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { nombreCategoria } from "@/lib/categorias";

export const dynamic = "force-dynamic";

// 12 buckets de 2 h (últimas 24 h): columnas más anchas y legibles.
const BUCKETS = 12;
const VENTANA = 2 * 3_600_000;

function bucketsDe(rows: { t: Date; cat: string | null }[]): Bucket[] {
  const now = Date.now();
  const buckets: Bucket[] = Array.from({ length: BUCKETS }, (_, i) => {
    const d = new Date(now - (BUCKETS - 1 - i) * VENTANA);
    return { label: `${String(d.getHours()).padStart(2, "0")}:00`, cats: [] as string[] };
  });
  for (const r of rows) {
    const idx = BUCKETS - 1 - Math.floor((now - r.t.getTime()) / VENTANA);
    if (idx >= 0 && idx < BUCKETS) buckets[idx]!.cats.push(nombreCategoria(r.cat));
  }
  return buckets;
}

function relativo(date: Date | null): string {
  if (!date) return "—";
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const estadoColor: Record<string, string> = {
  activa: "var(--color-success)",
  pausada: "var(--color-muted)",
  error: "var(--color-danger)",
};

const ESTADO_DONUT: { estado: string; label: string; color: string }[] = [
  { estado: "en_revision", label: "En revisión", color: "var(--color-warning)" },
  { estado: "aprobada", label: "Aprobadas", color: "var(--color-brand)" },
  { estado: "publicada", label: "Publicadas", color: "var(--color-success)" },
  { estado: "rechazada", label: "Rechazadas", color: "var(--color-danger)" },
];

export default async function DashboardPage() {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const hace24h = new Date(Date.now() - 24 * 3_600_000);

  const n = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);

  const [
    ingestadasHoy,
    enCuraduria,
    enRevision,
    enCola,
    publicadasHoy,
    entradaRows,
    salidaRows,
    versEstado,
    fuentesRows,
    escenariosRows,
  ] = await Promise.all([
    db.select({ n: count() }).from(articles).where(and(gte(articles.createdAt, inicioHoy), isNull(articles.deletedAt))).then(n),
    db.select({ n: count() }).from(articles).where(and(eq(articles.curacion, "pendiente"), isNull(articles.deletedAt))).then(n),
    db.select({ n: count() }).from(versions).where(eq(versions.estado, "en_revision")).then(n),
    db.select({ n: count() }).from(publications).where(eq(publications.estado, "en_cola")).then(n),
    db.select({ n: count() }).from(publications).where(and(eq(publications.estado, "publicada"), gte(publications.updatedAt, inicioHoy))).then(n),
    db
      .select({ t: articles.createdAt, cat: articles.categoria, tags: articles.tags })
      .from(articles)
      .where(and(gte(articles.createdAt, hace24h), isNull(articles.deletedAt))),
    db
      .select({ t: publications.updatedAt, cat: publications.categoria })
      .from(publications)
      .where(and(eq(publications.estado, "publicada"), gte(publications.updatedAt, hace24h))),
    db.select({ estado: versions.estado, n: count() }).from(versions).groupBy(versions.estado),
    db.select().from(sources).orderBy(desc(sources.createdAt)),
    db
      .select({ nombre: escenarios.nombre, activo: escenarios.activo, moderacion: escenarios.moderacion })
      .from(escenarios)
      .orderBy(desc(escenarios.createdAt)),
  ]);

  const escenariosActivos = escenariosRows.filter((e) => e.activo);
  const autoPublican = escenariosActivos.filter((e) => !e.moderacion).length;

  const entrada = bucketsDe(
    entradaRows.map((r) => ({ t: r.t, cat: r.cat ?? r.tags?.[0] ?? null })),
  );
  const salida = bucketsDe(salidaRows.map((r) => ({ t: r.t, cat: r.cat })));

  const conteo = new Map<string, number>();
  for (const b of [...entrada, ...salida])
    for (const c of b.cats) conteo.set(c, (conteo.get(c) ?? 0) + 1);
  const leyenda = [...conteo.entries()]
    .map(([nombre, c]) => ({ nombre, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const estadoMap = new Map<string, number>(
    versEstado.map((v) => [v.estado as string, Number(v.n)]),
  );
  const donut = ESTADO_DONUT.map((e) => ({
    label: e.label,
    value: estadoMap.get(e.estado) ?? 0,
    color: e.color,
  })).filter((d) => d.value > 0);

  const hora = new Date().getHours();
  const saludo = hora < 13 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <AutoRefresh seconds={20} />
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">{fecha}</p>
          <h2 className="mt-1 font-display text-[2rem] font-medium tracking-tight text-fg">
            {saludo}, Javier
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tenés{" "}
            <Link href="/moderacion" className="font-medium text-fg hover:text-brand">
              {enRevision} en moderación
            </Link>{" "}
            y{" "}
            <Link href="/curaduria" className="font-medium text-fg hover:text-brand">
              {enCuraduria} en la bandeja de entrada
            </Link>
            .
          </p>
        </div>
        <Link href="/pegar">
          <Button>
            Pegar URL
            <ArrowUpRight className="size-4" />
          </Button>
        </Link>
      </Reveal>

      {/* KPIs reales */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
        {[
          <MetricCard
            key="1"
            label="Ingestadas hoy"
            value={String(ingestadasHoy)}
            icon={DownloadCloud}
            spark={entrada.map((b) => b.cats.length)}
            color="var(--color-brand)"
          />,
          <MetricCard
            key="2"
            label="En entrada"
            value={String(enCuraduria)}
            hint="sin procesar"
            icon={Inbox}
            color="var(--color-accent)"
          />,
          <MetricCard
            key="3"
            label="En moderación"
            value={String(enRevision)}
            hint="versiones"
            icon={Newspaper}
            color="var(--color-warning)"
          />,
          <MetricCard
            key="4"
            label="En cola"
            value={String(enCola)}
            hint="bandeja"
            icon={SendHorizontal}
            color="var(--color-info)"
          />,
          <MetricCard
            key="5"
            label="Publicadas hoy"
            value={String(publicadasHoy)}
            icon={CheckCircle2}
            spark={salida.map((b) => b.cats.length)}
            color="var(--color-success)"
          />,
        ].map((card, i) => (
          <Reveal key={i} delay={0.04 * i}>
            {card}
          </Reveal>
        ))}
      </div>

      {/* Pulso (entrada vs salida) */}
      <Reveal delay={0.1}>
        <Pulso entrada={entrada} salida={salida} leyenda={leyenda} />
      </Reveal>

      {/* Estados + fuentes */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal delay={0.15}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Versiones por estado</CardTitle>
            </CardHeader>
            <CardBody>
              {donut.length > 0 ? (
                <Donut data={donut} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">Sin versiones todavía.</p>
              )}
            </CardBody>
          </Card>
        </Reveal>

        <Reveal delay={0.2}>
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Escenarios</CardTitle>
              <span className="grid size-8 place-items-center rounded-lg bg-elevated text-brand">
                <Workflow className="size-4" />
              </span>
            </CardHeader>
            <CardBody className="flex flex-1 flex-col">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[var(--radius)] bg-elevated/40 p-3">
                  <p className="font-mono text-2xl font-medium text-fg">
                    {escenariosActivos.length}
                    <span className="ml-1 text-sm text-muted">
                      /{escenariosRows.length}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">activos</p>
                </div>
                <div className="rounded-[var(--radius)] bg-elevated/40 p-3">
                  <p className="font-mono text-2xl font-medium text-fg">
                    {autoPublican}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">auto-publican</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {escenariosRows.slice(0, 4).map((e) => (
                  <li key={e.nombre} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: e.activo
                          ? "var(--color-success)"
                          : "var(--color-muted)",
                      }}
                    />
                    <span className="truncate text-fg">{e.nombre}</span>
                    <Badge
                      tone={e.moderacion ? "neutral" : "info"}
                      className="ml-auto"
                    >
                      {e.moderacion ? "modera" : "auto"}
                    </Badge>
                  </li>
                ))}
                {escenariosRows.length === 0 && (
                  <li className="text-sm text-muted">Sin escenarios todavía.</li>
                )}
              </ul>

              <Link href="/escenarios" className="mt-auto pt-4">
                <Button variant="outline" className="w-full">
                  Abrir Escenarios
                  <ArrowUpRight className="size-4" />
                </Button>
              </Link>
            </CardBody>
          </Card>
        </Reveal>

        <Reveal delay={0.25}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Salud de fuentes</CardTitle>
              <Badge tone="success">
                {fuentesRows.filter((f) => f.estado === "activa").length} activas
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {fuentesRows.length === 0 ? (
                <p className="text-sm text-muted">No hay fuentes cargadas.</p>
              ) : (
                fuentesRows.slice(0, 6).map((f) => (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: estadoColor[f.estado] ?? "var(--color-muted)" }}
                    />
                    <span className="truncate font-medium text-fg">{f.nombre ?? f.url}</span>
                    <Badge className="ml-auto">{f.tipo.toUpperCase()}</Badge>
                    <span className="w-24 text-right text-xs text-muted">
                      {relativo(f.lastCheck)}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
