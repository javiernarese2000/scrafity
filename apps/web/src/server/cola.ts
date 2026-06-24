"use server";

import {
  articles,
  type Cadencia,
  db,
  destinations,
  publications,
  versions,
} from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { despachar, publicarItem, type ResultadoDespacho } from "./despachador";
import type { Asignacion } from "./publicar";

/**
 * Envía una nota a la bandeja de salida: por cada destino crea una publicación
 * `en_cola` (no publica). La categoría sale del primer tag de la nota. Marca la
 * versión elegida 'aprobada' y descarta las hermanas en revisión.
 */
export async function enviarACola(articleId: string, asignaciones: Asignacion[]) {
  if (asignaciones.length === 0) return;

  const [art] = await db
    .select({ tags: articles.tags, categoria: articles.categoria })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  const categoria = art?.categoria ?? art?.tags?.[0] ?? null;

  const vers = await db
    .select({ id: versions.id, estado: versions.estado })
    .from(versions)
    .where(eq(versions.articleId, articleId));
  const validIds = new Set(vers.map((v) => v.id));
  // Seguro: ignorar asignaciones cuyo versionId no sea de esta nota (estado
  // viejo del modal). Si no queda ninguna válida, no tocar nada.
  const validas = asignaciones.filter((a) => validIds.has(a.versionId));
  if (validas.length === 0) return;

  for (const a of validas) {
    await db
      .insert(publications)
      .values({
        versionId: a.versionId,
        destinationId: a.destinationId,
        estado: "en_cola",
        categoria,
        imagenUrl: a.imagenUrl,
        idempotencyKey: `${a.versionId}:${a.destinationId}`,
      })
      .onConflictDoUpdate({
        target: publications.idempotencyKey,
        set: {
          estado: "en_cola",
          categoria,
          imagenUrl: a.imagenUrl,
          error: null,
          updatedAt: new Date(),
        },
      });
  }

  const elegidas = new Set(validas.map((a) => a.versionId));
  for (const v of vers) {
    if (elegidas.has(v.id)) {
      await db
        .update(versions)
        .set({ estado: "aprobada", updatedAt: new Date() })
        .where(eq(versions.id, v.id));
    } else if (v.estado === "en_revision") {
      await db
        .update(versions)
        .set({ estado: "rechazada", updatedAt: new Date() })
        .where(eq(versions.id, v.id));
    }
  }

  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
  revalidatePath("/bandeja");
}

/** Publica un ítem de la cola ahora mismo (sin esperar al despachador). */
export async function publicarYa(pubId: string): Promise<{ ok: boolean; error?: string }> {
  const r = await publicarItem(pubId);
  revalidatePath("/bandeja");
  revalidatePath("/biblioteca");
  return r;
}

/** Saca un ítem de la cola (no se publica; la versión queda en Biblioteca). */
export async function quitarDeCola(pubId: string) {
  await db.delete(publications).where(eq(publications.id, pubId));
  revalidatePath("/bandeja");
}

export async function setPrioridad(pubId: string, prioridad: boolean) {
  await db
    .update(publications)
    .set({ prioridad, updatedAt: new Date() })
    .where(eq(publications.id, pubId));
  revalidatePath("/bandeja");
}

/** Asigna la categoría de UNA publicación en cola (drag entre columnas). */
export async function setCategoriaPublicacion(pubId: string, categoria: string | null) {
  await db
    .update(publications)
    .set({ categoria: categoria || null, updatedAt: new Date() })
    .where(eq(publications.id, pubId));
  revalidatePath("/bandeja");
}

/** Corre el despachador ahora (manual). Igual que el cron. */
export async function despacharAhora(): Promise<ResultadoDespacho> {
  const r = await despachar();
  revalidatePath("/bandeja");
  revalidatePath("/biblioteca");
  return r;
}

/** Guarda la cadencia de un destino. */
export async function guardarCadencia(destinationId: string, cadencia: Cadencia) {
  await db
    .update(destinations)
    .set({ cadencia, updatedAt: new Date() })
    .where(eq(destinations.id, destinationId));
  revalidatePath("/bandeja");
  revalidatePath("/destinos");
}
