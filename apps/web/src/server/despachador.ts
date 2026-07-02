import { articles, db, destinations, publications, versions } from "@scrapify/db";
import { and, eq, gte, isNull, lte } from "drizzle-orm";

import { parseCredenciales, publicarEnWordpress } from "./wordpress";

/**
 * Publica UN ítem de la cola a su destino (WordPress por REST o sitio propio por
 * feed). Actualiza la publicación y, si sale OK, marca la versión 'publicada'.
 */
export async function publicarItem(
  pubId: string,
): Promise<{ ok: boolean; error?: string }> {
  const [pub] = await db
    .select()
    .from(publications)
    .where(eq(publications.id, pubId))
    .limit(1);
  if (!pub || (pub.estado !== "en_cola" && pub.estado !== "pendiente")) {
    return { ok: false, error: "La publicación no está en la cola." };
  }

  const [destino] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, pub.destinationId))
    .limit(1);
  const [version] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, pub.versionId))
    .limit(1);
  if (!destino || !version) return { ok: false, error: "Faltan datos." };

  const [art] = await db
    .select({ imagenUrl: articles.imagenUrl, tags: articles.tags })
    .from(articles)
    .where(eq(articles.id, version.articleId))
    .limit(1);

  let estado: "publicada" | "error" = "publicada";
  let urlPublicada: string | null = null;
  let externalId: string | null = null;
  let error: string | null = null;

  if (destino.tipo === "wordpress_cliente") {
    try {
      const cfg = (destino.configApi ?? {}) as { url?: string };
      if (!cfg.url) throw new Error("El destino no tiene URL configurada.");
      const r = await publicarEnWordpress({
        url: cfg.url,
        cred: parseCredenciales(destino.credencialesCifradas),
        titulo: version.titulo ?? "(sin título)",
        contenidoMarkdown: version.contenido,
        imagenUrl: pub.imagenUrl ?? art?.imagenUrl ?? null,
        categoriaNombre: pub.categoria,
        tags: art?.tags ?? [],
      });
      urlPublicada = r.urlPublicada || null;
      externalId = r.externalId || null;
    } catch (e) {
      estado = "error";
      error = e instanceof Error ? e.message : "Falló la publicación.";
    }
  }

  await db
    .update(publications)
    .set({ estado, urlPublicada, externalId, error, updatedAt: new Date() })
    .where(eq(publications.id, pubId));

  if (estado === "publicada") {
    await db
      .update(versions)
      .set({ estado: "publicada", updatedAt: new Date() })
      .where(eq(versions.id, version.id));
  }

  return { ok: estado === "publicada", error: error ?? undefined };
}

type ItemCola = { id: string; categoria: string | null; prioridad: boolean };

/** Elige hasta `cupo` ítems: primero los prioritarios, luego según el modo. */
function elegir(
  items: ItemCola[],
  modo: "equilibrado" | "random",
  cupo: number,
): ItemCola[] {
  const prioritarios = items.filter((i) => i.prioridad);
  let resto = items.filter((i) => !i.prioridad);

  if (modo === "random") {
    resto = [...resto].sort(() => Math.random() - 0.5);
  } else {
    // Equilibrado: round-robin entre categorías para no spamear un tema.
    const buckets = new Map<string, ItemCola[]>();
    for (const it of resto) {
      const k = it.categoria ?? "—";
      (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(it);
    }
    const colas = [...buckets.values()];
    const intercalado: ItemCola[] = [];
    let quedan = true;
    while (quedan) {
      quedan = false;
      for (const c of colas) {
        const next = c.shift();
        if (next) {
          intercalado.push(next);
          quedan = true;
        }
      }
    }
    resto = intercalado;
  }

  return [...prioritarios, ...resto].slice(0, cupo);
}

export type ResultadoDespacho = { despachadas: number; errores: number };

/**
 * Recorre los destinos con cadencia activa y, si está dentro de la franja y no
 * se llenó el cupo de la ventana, suelta hasta `cantidad` ítems de la cola.
 */
export async function despachar(): Promise<ResultadoDespacho> {
  const res: ResultadoDespacho = { despachadas: 0, errores: 0 };

  // 1) Programadas del Calendario: se sueltan apenas llega su hora, sin importar
  // la cadencia (esa es la promesa del calendario: "publicar a esta hora").
  const vencidas = await db
    .select({ id: publications.id })
    .from(publications)
    .where(
      and(
        eq(publications.estado, "en_cola"),
        lte(publications.programadaEn, new Date()),
      ),
    );
  for (const item of vencidas) {
    const r = await publicarItem(item.id);
    if (r.ok) res.despachadas += 1;
    else res.errores += 1;
  }

  // 2) Sin fecha (programadaEn null): despacho automático por cadencia (previo).
  const destinos = await db.select().from(destinations);
  const hora = new Date().getHours();

  for (const d of destinos) {
    const cad = d.cadencia;
    if (!cad?.activo) continue;
    if (hora < cad.franjaInicio || hora >= cad.franjaFin) continue;

    const desde = new Date(Date.now() - cad.cadaMinutos * 60_000);
    const yaEnVentana = await db
      .select({ id: publications.id })
      .from(publications)
      .where(
        and(
          eq(publications.destinationId, d.id),
          eq(publications.estado, "publicada"),
          gte(publications.updatedAt, desde),
        ),
      );
    const cupo = cad.cantidad - yaEnVentana.length;
    if (cupo <= 0) continue;

    const enCola = await db
      .select({
        id: publications.id,
        categoria: publications.categoria,
        prioridad: publications.prioridad,
      })
      .from(publications)
      .where(
        and(
          eq(publications.destinationId, d.id),
          eq(publications.estado, "en_cola"),
          isNull(publications.programadaEn),
        ),
      );

    for (const item of elegir(enCola, cad.modo, cupo)) {
      const r = await publicarItem(item.id);
      if (r.ok) res.despachadas += 1;
      else res.errores += 1;
    }
  }

  return res;
}
