"use server";

import { db, destinations, publications, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Asignacion = { destinationId: string; versionId: string };

/**
 * Publica una nota: por cada asignación destino→versión crea una publicación.
 * Sitios propios quedan "publicada" (los lee el feed); WordPress queda
 * "pendiente" hasta tener el conector. Resuelve la nota (sale de la cola).
 */
export async function publicar(articleId: string, asignaciones: Asignacion[]) {
  if (asignaciones.length === 0) return;

  const tipos = new Map(
    (await db.select().from(destinations)).map((d) => [d.id, d.tipo]),
  );

  for (const a of asignaciones) {
    const esPropio = tipos.get(a.destinationId) === "sitio_propio";
    await db
      .insert(publications)
      .values({
        versionId: a.versionId,
        destinationId: a.destinationId,
        estado: esPropio ? "publicada" : "pendiente",
        idempotencyKey: `${a.versionId}:${a.destinationId}`,
      })
      .onConflictDoNothing();
  }

  const publicadas = new Set(asignaciones.map((a) => a.versionId));
  const vers = await db
    .select({ id: versions.id })
    .from(versions)
    .where(eq(versions.articleId, articleId));

  for (const v of vers) {
    await db
      .update(versions)
      .set({
        estado: publicadas.has(v.id) ? "publicada" : "rechazada",
        updatedAt: new Date(),
      })
      .where(eq(versions.id, v.id));
  }

  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
}
