"use server";

import crypto from "node:crypto";

import { db, media } from "@scrapify/db";
import { desc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "imagenes";

export type MediaItem = {
  id: string;
  url: string;
  nombre: string | null;
  tags: string[];
};

function normTags(raw: string[] | string): string[] {
  const arr = Array.isArray(raw) ? raw : raw.split(",");
  return [...new Set(arr.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

/** Sube una imagen a la biblioteca global con sus tags. */
export async function subirMedia(
  formData: FormData,
  tagsRaw: string,
): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Archivo inválido" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "El archivo no es una imagen" };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `media/${crypto.randomUUID()}.${ext}`;
  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: error.message };

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const nombre = file.name.replace(/\.[^.]+$/, "");
  const tags = normTags(tagsRaw);

  const [row] = await db
    .insert(media)
    .values({ url, path, nombre, tags })
    .returning();

  revalidatePath("/multimedia");
  return {
    ok: true,
    item: { id: row!.id, url: row!.url, nombre: row!.nombre, tags: row!.tags },
  };
}

/** Busca en la biblioteca por nombre o tags (vacío = recientes). */
export async function buscarMedia(query: string): Promise<MediaItem[]> {
  const q = query.trim().toLowerCase();
  const base = db
    .select({ id: media.id, url: media.url, nombre: media.nombre, tags: media.tags })
    .from(media);

  const rows = q
    ? await base
        .where(
          or(
            sql`lower(coalesce(${media.nombre}, '')) like ${`%${q}%`}`,
            sql`exists (select 1 from unnest(${media.tags}) tg where tg like ${`%${q}%`})`,
          ),
        )
        .orderBy(desc(media.createdAt))
        .limit(60)
    : await base.orderBy(desc(media.createdAt)).limit(60);

  return rows;
}

export async function setTagsMedia(id: string, tagsRaw: string) {
  await db
    .update(media)
    .set({ tags: normTags(tagsRaw), updatedAt: new Date() })
    .where(eq(media.id, id));
  revalidatePath("/multimedia");
}

export async function eliminarMedia(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return;
  await db.delete(media).where(eq(media.id, id));
  await createAdminClient().storage.from(BUCKET).remove([row.path]);
  revalidatePath("/multimedia");
}
