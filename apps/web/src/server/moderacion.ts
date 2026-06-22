"use server";

import { articles, db, versions } from "@scrapify/db";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { computeSimilarity } from "@/lib/diff";

export async function setImagen(articleId: string, url: string | null) {
  await db
    .update(articles)
    .set({ imagenUrl: url, updatedAt: new Date() })
    .where(eq(articles.id, articleId));
  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
}

export async function aprobarVersion(versionId: string, articleId: string) {
  await db
    .update(versions)
    .set({ estado: "aprobada", updatedAt: new Date() })
    .where(eq(versions.id, versionId));
  // Las hermanas en revisión se descartan (se elige una versión por nota).
  await db
    .update(versions)
    .set({ estado: "rechazada", updatedAt: new Date() })
    .where(
      and(
        eq(versions.articleId, articleId),
        ne(versions.id, versionId),
        eq(versions.estado, "en_revision"),
      ),
    );
  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
}

export async function rechazarNota(articleId: string) {
  await db
    .update(versions)
    .set({ estado: "rechazada", updatedAt: new Date() })
    .where(
      and(eq(versions.articleId, articleId), eq(versions.estado, "en_revision")),
    );
  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
}

export async function guardarEdicion(
  versionId: string,
  titulo: string,
  contenido: string,
) {
  const [v] = await db
    .select({ articleId: versions.articleId })
    .from(versions)
    .where(eq(versions.id, versionId))
    .limit(1);
  if (!v) return;

  const [a] = await db
    .select({
      original: articles.snapshotOriginal,
      contenido: articles.contenido,
    })
    .from(articles)
    .where(eq(articles.id, v.articleId))
    .limit(1);

  const original = a?.original ?? a?.contenido ?? "";

  await db
    .update(versions)
    .set({
      titulo,
      contenido,
      similarityScore: computeSimilarity(original, contenido),
      updatedAt: new Date(),
    })
    .where(eq(versions.id, versionId));
  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
}
