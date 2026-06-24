import { articles, db, destinations, publications, versions } from "@scrapify/db";
import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { BandejaBoard, type DestinoCola } from "@/components/bandeja/bandeja-board";

export const dynamic = "force-dynamic";

function relativo(date: Date): string {
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default async function BandejaPage() {
  const destinos = await db
    .select()
    .from(destinations)
    .orderBy(destinations.createdAt);

  const filas = await db
    .select({
      id: publications.id,
      destinationId: publications.destinationId,
      categoria: publications.categoria,
      prioridad: publications.prioridad,
      titulo: versions.titulo,
      url: articles.urlOriginal,
      created: publications.createdAt,
    })
    .from(publications)
    .innerJoin(versions, eq(publications.versionId, versions.id))
    .innerJoin(articles, eq(versions.articleId, articles.id))
    .where(eq(publications.estado, "en_cola"))
    .orderBy(desc(publications.createdAt));

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const hace24h = new Date(Date.now() - 24 * 3600_000);
  const publicadas = await db
    .select({
      destinationId: publications.destinationId,
      updated: publications.updatedAt,
    })
    .from(publications)
    .where(
      and(
        eq(publications.estado, "publicada"),
        gte(publications.updatedAt, hace24h),
      ),
    );
  const hoyPorDestino = new Map<string, number>();
  const publicadasPorDestino = new Map<string, number[]>();
  for (const p of publicadas) {
    if (p.updated >= inicioHoy)
      hoyPorDestino.set(p.destinationId, (hoyPorDestino.get(p.destinationId) ?? 0) + 1);
    const arr = publicadasPorDestino.get(p.destinationId) ?? [];
    arr.push(p.updated.getTime());
    publicadasPorDestino.set(p.destinationId, arr);
  }

  // Próxima tanda por destino: cuándo la cadencia permite soltar de nuevo.
  function proximaTanda(
    cad: (typeof destinos)[number]["cadencia"],
    publicadasMs: number[],
    hayCola: boolean,
  ): string | null {
    if (!cad?.activo || !hayCola) return null;
    const now = Date.now();
    const ms = cad.cadaMinutos * 60_000;
    const enVentana = publicadasMs.filter((t) => t >= now - ms).sort((a, b) => a - b);
    const baseMs =
      enVentana.length < cad.cantidad
        ? now
        : enVentana[enVentana.length - cad.cantidad]! + ms;
    const base = new Date(baseMs);
    const h = base.getHours();
    if (h < cad.franjaInicio) base.setHours(cad.franjaInicio, 0, 0, 0);
    else if (h >= cad.franjaFin) {
      base.setDate(base.getDate() + 1);
      base.setHours(cad.franjaInicio, 0, 0, 0);
    }
    return base.toISOString();
  }

  // Actividad reciente (publicadas + errores) para auditar qué salió.
  const actividad = await db
    .select({
      id: publications.id,
      destinationId: publications.destinationId,
      categoria: publications.categoria,
      estado: publications.estado,
      url: publications.urlPublicada,
      error: publications.error,
      titulo: versions.titulo,
      updated: publications.updatedAt,
    })
    .from(publications)
    .innerJoin(versions, eq(publications.versionId, versions.id))
    .where(inArray(publications.estado, ["publicada", "error"]))
    .orderBy(desc(publications.updatedAt))
    .limit(120);

  const data: DestinoCola[] = destinos.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    cadencia: d.cadencia ?? null,
    publicadasHoy: hoyPorDestino.get(d.id) ?? 0,
    proximaISO: proximaTanda(
      d.cadencia ?? null,
      publicadasPorDestino.get(d.id) ?? [],
      filas.some((f) => f.destinationId === d.id),
    ),
    items: filas
      .filter((f) => f.destinationId === d.id)
      .map((f) => {
        let fuente = "fuente";
        try {
          fuente = new URL(f.url).hostname.replace(/^www\./, "");
        } catch {
          /* noop */
        }
        return {
          id: f.id,
          titulo: f.titulo ?? "(sin título)",
          fuente,
          categoria: f.categoria,
          prioridad: f.prioridad,
          fecha: relativo(f.created),
        };
      }),
    actividad: actividad
      .filter((a) => a.destinationId === d.id)
      .map((a) => ({
        id: a.id,
        titulo: a.titulo ?? "(sin título)",
        categoria: a.categoria,
        estado: a.estado as "publicada" | "error",
        url: a.url,
        error: a.error,
        fecha: relativo(a.updated),
      })),
  }));

  return <BandejaBoard destinos={data} />;
}
