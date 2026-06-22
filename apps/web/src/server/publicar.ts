"use server";

import { db, destinations, publications, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Asignacion = {
  destinationId: string;
  versionId: string;
  imagenUrl: string | null;
};

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
        imagenUrl: a.imagenUrl,
        idempotencyKey: `${a.versionId}:${a.destinationId}`,
      })
      .onConflictDoNothing();
  }

  const publicadas = new Set(asignaciones.map((a) => a.versionId));
  const vers = await db
    .select({ id: versions.id, estado: versions.estado })
    .from(versions)
    .where(eq(versions.articleId, articleId));

  for (const v of vers) {
    if (publicadas.has(v.id)) {
      await db
        .update(versions)
        .set({ estado: "publicada", updatedAt: new Date() })
        .where(eq(versions.id, v.id));
    } else if (v.estado === "en_revision") {
      // Solo descarta borradores no usados; no toca versiones ya publicadas.
      await db
        .update(versions)
        .set({ estado: "rechazada", updatedAt: new Date() })
        .where(eq(versions.id, v.id));
    }
  }

  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${articleId}`);
}
