"use server";

import crypto from "node:crypto";

import { articles, db } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "imagenes";

export async function subirImagen(
  articleId: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Archivo inválido" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "El archivo no es una imagen" };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${articleId}/${crypto.randomUUID()}.${ext}`;
  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: error.message };

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const [art] = await db
    .select({ imagenUrl: articles.imagenUrl, imagenes: articles.imagenes })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  await db
    .update(articles)
    .set({
      imagenes: [...(art?.imagenes ?? []), url],
      imagenUrl: art?.imagenUrl ?? url, // primera imagen = portada por defecto
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId));

  revalidatePath(`/biblioteca/${articleId}`);
  revalidatePath("/biblioteca");
  return { ok: true, url };
}

export async function setPortada(articleId: string, url: string | null) {
  await db
    .update(articles)
    .set({ imagenUrl: url, updatedAt: new Date() })
    .where(eq(articles.id, articleId));
  revalidatePath(`/biblioteca/${articleId}`);
  revalidatePath("/biblioteca");
}

export async function quitarImagen(articleId: string, url: string) {
  const [art] = await db
    .select({ imagenUrl: articles.imagenUrl, imagenes: articles.imagenes })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  const nuevas = (art?.imagenes ?? []).filter((u) => u !== url);
  const cover = art?.imagenUrl === url ? (nuevas[0] ?? null) : art?.imagenUrl;

  await db
    .update(articles)
    .set({ imagenes: nuevas, imagenUrl: cover, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  // Borrado best-effort del Storage
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    const path = url.slice(idx + marker.length);
    await createAdminClient().storage.from(BUCKET).remove([path]);
  }

  revalidatePath(`/biblioteca/${articleId}`);
  revalidatePath("/biblioteca");
}
