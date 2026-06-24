"use server";

import { articles, db, destinations, publications, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { parseCredenciales, publicarEnWordpress } from "./wordpress";

export type Asignacion = {
  destinationId: string;
  versionId: string;
  imagenUrl: string | null;
};

/**
 * Publica una nota: por cada asignación destino→versión crea/actualiza una
 * publicación. Sitios propios quedan "publicada" (los lee el feed). WordPress
 * se empuja por REST API: queda "publicada" con la URL o "error" con el detalle
 * (reintentable desde Biblioteca). Resuelve la nota (sale de la cola).
 */
export type ResultadoPublicacion = {
  publicadas: number;
  errores: { destino: string; error: string }[];
};

export async function publicar(
  articleId: string,
  asignaciones: Asignacion[],
): Promise<ResultadoPublicacion> {
  if (asignaciones.length === 0) return { publicadas: 0, errores: [] };

  const resultado: ResultadoPublicacion = { publicadas: 0, errores: [] };
  const versionesOk = new Set<string>();

  const destinos = new Map(
    (await db.select().from(destinations)).map((d) => [d.id, d]),
  );
  const vers = new Map(
    (await db.select().from(versions).where(eq(versions.articleId, articleId))).map(
      (v) => [v.id, v],
    ),
  );
  const [art] = await db
    .select({
      imagenUrl: articles.imagenUrl,
      tags: articles.tags,
      categoria: articles.categoria,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  const categoria = art?.categoria ?? art?.tags?.[0] ?? null;

  // Seguro: ignorar asignaciones con versionId que no sea de esta nota (estado
  // viejo del modal). Si no queda ninguna válida, no tocar las versiones.
  const validas = asignaciones.filter((a) => vers.has(a.versionId));
  if (validas.length === 0) return resultado;

  for (const a of validas) {
    const destino = destinos.get(a.destinationId);
    const version = vers.get(a.versionId);
    if (!destino || !version) continue;

    const esPropio = destino.tipo === "sitio_propio";
    let estado: "publicada" | "pendiente" | "error" = esPropio
      ? "publicada"
      : "pendiente";
    let urlPublicada: string | null = null;
    let externalId: string | null = null;
    let error: string | null = null;

    if (destino.tipo === "wordpress_cliente") {
      try {
        const cfg = (destino.configApi ?? {}) as { url?: string };
        if (!cfg.url) throw new Error("El destino no tiene URL configurada.");
        const cred = parseCredenciales(destino.credencialesCifradas);
        const r = await publicarEnWordpress({
          url: cfg.url,
          cred,
          titulo: version.titulo ?? "(sin título)",
          contenidoMarkdown: version.contenido,
          imagenUrl: a.imagenUrl ?? art?.imagenUrl ?? null,
          categoriaNombre: categoria,
          tags: art?.tags ?? [],
        });
        estado = "publicada";
        urlPublicada = r.urlPublicada || null;
        externalId = r.externalId || null;
      } catch (e) {
        estado = "error";
        error = e instanceof Error ? e.message : "Falló la publicación en WordPress.";
      }
    }

    if (estado === "error") {
      resultado.errores.push({ destino: destino.nombre, error: error ?? "Error" });
    } else {
      resultado.publicadas += 1;
      versionesOk.add(a.versionId);
    }

    const idempotencyKey = `${a.versionId}:${a.destinationId}`;
    await db
      .insert(publications)
      .values({
        versionId: a.versionId,
        destinationId: a.destinationId,
        estado,
        categoria,
        imagenUrl: a.imagenUrl,
        urlPublicada,
        externalId,
        error,
        idempotencyKey,
      })
      .onConflictDoUpdate({
        target: publications.idempotencyKey,
        set: { estado, categoria, imagenUrl: a.imagenUrl, urlPublicada, externalId, error, updatedAt: new Date() },
      });
  }

  const elegidas = new Set(validas.map((a) => a.versionId));
  for (const v of vers.values()) {
    if (versionesOk.has(v.id)) {
      await db
        .update(versions)
        .set({ estado: "publicada", updatedAt: new Date() })
        .where(eq(versions.id, v.id));
    } else if (!elegidas.has(v.id) && v.estado === "en_revision") {
      // Solo descarta borradores no usados; las elegidas que fallaron quedan
      // en revisión para reintentar. No toca versiones ya publicadas.
      await db
        .update(versions)
        .set({ estado: "rechazada", updatedAt: new Date() })
        .where(eq(versions.id, v.id));
    }
  }

  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${articleId}`);
  revalidatePath("/destinos");
  return resultado;
}
