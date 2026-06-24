"use server";

import { articles, db, publications, versions } from "@scrapify/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { aplicarRetencion, type ResultadoRetencion } from "./retencion";

export async function setArchivada(id: string, archivada: boolean) {
  await db
    .update(articles)
    .set({ archivada, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
}

export async function setTags(id: string, tags: string[]) {
  await db
    .update(articles)
    .set({ tags, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
}

/** Cambia la categoría de la nota y reacomoda lo que ya esté en la cola. */
export async function setCategoria(id: string, categoria: string) {
  const cat = categoria.trim() || null;
  await db
    .update(articles)
    .set({ categoria: cat, updatedAt: new Date() })
    .where(eq(articles.id, id));

  const vers = await db
    .select({ id: versions.id })
    .from(versions)
    .where(eq(versions.articleId, id));
  const ids = vers.map((v) => v.id);
  if (ids.length) {
    await db
      .update(publications)
      .set({ categoria: cat })
      .where(
        and(inArray(publications.versionId, ids), eq(publications.estado, "en_cola")),
      );
  }

  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
  revalidatePath("/bandeja");
}

/** Manda una nota a la papelera (soft delete, recuperable). */
export async function eliminarNota(id: string) {
  await db
    .update(articles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/biblioteca");
  revalidatePath("/papelera");
  revalidatePath("/moderacion");
  revalidatePath("/curaduria");
}

/** Restaura una nota desde la papelera. */
export async function restaurarNota(id: string) {
  await db
    .update(articles)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/papelera");
  revalidatePath("/biblioteca");
}

/** Borra definitivamente una nota (cascada: versiones, publicaciones, jobs). */
export async function eliminarDefinitivo(id: string) {
  await db.delete(articles).where(eq(articles.id, id));
  revalidatePath("/papelera");
}

/** Vacía la papelera (borrado definitivo de todo lo que esté en ella). */
export async function vaciarPapelera() {
  await db.delete(articles).where(isNotNull(articles.deletedAt));
  revalidatePath("/papelera");
}

/** Ejecuta la política de retención ahora (manual). Igual que el cron diario. */
export async function limpiarAhora(): Promise<ResultadoRetencion> {
  const r = await aplicarRetencion();
  revalidatePath("/papelera");
  revalidatePath("/biblioteca");
  return r;
}
