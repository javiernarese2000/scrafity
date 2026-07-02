"use server";

import {
  articles,
  db,
  escenarioDestinos,
  publications,
  versions,
} from "@scrapify/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ProviderName } from "@/ai";
import { generarVersionesCore } from "./generar";
import { extraerNota } from "./notas";

export type NotaPreparada = {
  versionId: string;
  titulo: string;
  contenido: string;
  original: string;
  imagenUrl: string | null;
  imagenes: string[];
  similarity: number | null;
  destinosSugeridos: string[];
};

const VERSION_USABLE = ["en_revision", "aprobada", "borrador"] as const;

/**
 * Deja una nota lista para programar: si no tiene una versión reescrita usable,
 * la genera con la IA (1 versión, tono neutro). NO cambia la curación todavía —
 * eso pasa recién al programar, así si cancelás la nota sigue en el feed.
 */
export async function prepararNota(articleId: string): Promise<NotaPreparada> {
  const [art] = await db
    .select({
      escenarioId: articles.escenarioId,
      original: articles.contenido,
      imagenUrl: articles.imagenUrl,
      imagenes: articles.imagenes,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!art) throw new Error("Nota no encontrada.");

  const buscar = () =>
    db
      .select({
        id: versions.id,
        titulo: versions.titulo,
        contenido: versions.contenido,
        similarity: versions.similarityScore,
      })
      .from(versions)
      .where(
        and(
          eq(versions.articleId, articleId),
          inArray(versions.estado, [...VERSION_USABLE]),
        ),
      )
      .orderBy(desc(versions.createdAt))
      .limit(1);

  let [v] = await buscar();
  if (!v) {
    await generarVersionesCore(articleId, {
      nVersiones: 1,
      tono: "Neutro",
      proveedor: "auto",
      escenarioId: art.escenarioId,
    });
    [v] = await buscar();
  }
  if (!v) throw new Error("No se pudo generar la versión.");

  const sugeridos = art.escenarioId
    ? (
        await db
          .select({ id: escenarioDestinos.destinationId })
          .from(escenarioDestinos)
          .where(eq(escenarioDestinos.escenarioId, art.escenarioId))
      ).map((r) => r.id)
    : [];

  return {
    versionId: v.id,
    titulo: v.titulo ?? "",
    contenido: v.contenido,
    original: art.original ?? "",
    imagenUrl: art.imagenUrl,
    imagenes: art.imagenes ?? [],
    similarity: v.similarity,
    destinosSugeridos: sugeridos,
  };
}

/**
 * Rehace la reescritura con la IA usando tono/proveedor elegidos. Descarta el
 * borrador actual y genera uno nuevo. Devuelve la nota lista, igual que preparar.
 */
export async function regenerarNota(
  articleId: string,
  opts: { tono: string; proveedor: ProviderName | "auto" },
): Promise<NotaPreparada> {
  const [art] = await db
    .select({
      escenarioId: articles.escenarioId,
      original: articles.contenido,
      imagenUrl: articles.imagenUrl,
      imagenes: articles.imagenes,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!art) throw new Error("Nota no encontrada.");

  await db
    .update(versions)
    .set({ estado: "rechazada", updatedAt: new Date() })
    .where(
      and(
        eq(versions.articleId, articleId),
        inArray(versions.estado, ["en_revision", "borrador"]),
      ),
    );

  await generarVersionesCore(articleId, {
    nVersiones: 1,
    tono: opts.tono,
    proveedor: opts.proveedor,
    escenarioId: art.escenarioId,
  });

  const [v] = await db
    .select({
      id: versions.id,
      titulo: versions.titulo,
      contenido: versions.contenido,
      similarity: versions.similarityScore,
    })
    .from(versions)
    .where(and(eq(versions.articleId, articleId), eq(versions.estado, "en_revision")))
    .orderBy(desc(versions.createdAt))
    .limit(1);
  if (!v) throw new Error("No se pudo regenerar la versión.");

  const sugeridos = art.escenarioId
    ? (
        await db
          .select({ id: escenarioDestinos.destinationId })
          .from(escenarioDestinos)
          .where(eq(escenarioDestinos.escenarioId, art.escenarioId))
      ).map((r) => r.id)
    : [];

  return {
    versionId: v.id,
    titulo: v.titulo ?? "",
    contenido: v.contenido,
    original: art.original ?? "",
    imagenUrl: art.imagenUrl,
    imagenes: art.imagenes ?? [],
    similarity: v.similarity,
    destinosSugeridos: sugeridos,
  };
}

/**
 * Programa la nota en el calendario: guarda el texto editado, crea una
 * publicación `en_cola` con fecha por cada sitio y saca la nota del feed
 * (curación aprobada). El despachador la suelta a la hora programada.
 */
export async function programarNota(input: {
  articleId: string;
  versionId: string;
  titulo: string;
  contenido: string;
  destinos: string[];
  fechaISO: string;
  imagenUrl?: string | null;
}) {
  if (input.destinos.length === 0) throw new Error("Elegí al menos un sitio.");

  await db
    .update(versions)
    .set({
      titulo: input.titulo,
      contenido: input.contenido,
      estado: "aprobada",
      updatedAt: new Date(),
    })
    .where(eq(versions.id, input.versionId));

  const [art] = await db
    .select({ categoria: articles.categoria, tags: articles.tags })
    .from(articles)
    .where(eq(articles.id, input.articleId))
    .limit(1);
  const categoria = art?.categoria ?? art?.tags?.[0] ?? null;
  const programadaEn = new Date(input.fechaISO);
  const imagenUrl = input.imagenUrl ?? null;

  for (const destinationId of input.destinos) {
    await db
      .insert(publications)
      .values({
        versionId: input.versionId,
        destinationId,
        estado: "en_cola",
        programadaEn,
        categoria,
        imagenUrl,
        idempotencyKey: `${input.versionId}:${destinationId}`,
      })
      .onConflictDoUpdate({
        target: publications.idempotencyKey,
        set: { estado: "en_cola", programadaEn, categoria, imagenUrl, error: null, updatedAt: new Date() },
      });
  }

  // Descarta las versiones hermanas en revisión (quedó elegida ésta).
  await db
    .update(versions)
    .set({ estado: "rechazada", updatedAt: new Date() })
    .where(
      and(
        eq(versions.articleId, input.articleId),
        eq(versions.estado, "en_revision"),
      ),
    );

  await db
    .update(articles)
    .set({ curacion: "aprobada", updatedAt: new Date() })
    .where(eq(articles.id, input.articleId));

  revalidatePath("/noticias");
  revalidatePath("/calendario");
  revalidatePath("/bandeja");
}

/**
 * Vuelve a bajar y extraer el contenido de una nota ya ingestada (para tomar la
 * mejora de extracción: listas/calendarios que Readability descartaba). Descarta
 * los borradores viejos así se regeneran con el contenido nuevo.
 */
export async function reextraerNota(articleId: string) {
  const [art] = await db
    .select({ url: articles.urlOriginal })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!art) throw new Error("Nota no encontrada.");

  const ext = await extraerNota(art.url);
  if (!ext.ok) throw new Error(ext.error);

  await db
    .update(articles)
    .set({ contenido: ext.contenido, snapshotOriginal: ext.contenido, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  await db
    .update(versions)
    .set({ estado: "rechazada", updatedAt: new Date() })
    .where(
      and(
        eq(versions.articleId, articleId),
        inArray(versions.estado, ["en_revision", "borrador"]),
      ),
    );

  revalidatePath("/noticias");
}

/** Descarta una nota del feed: nunca se publica. */
export async function descartarNota(articleId: string) {
  await db
    .update(articles)
    .set({ curacion: "descartada", updatedAt: new Date() })
    .where(eq(articles.id, articleId));
  revalidatePath("/noticias");
}
