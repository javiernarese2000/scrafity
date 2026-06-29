import { readFile, writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET = "videos";

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Baja un archivo del bucket a un path local. */
export async function descargar(path: string, destFile: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`No se pudo bajar ${path}: ${error?.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  await writeFile(destFile, buf);
}

/** Sube un archivo local al bucket. */
export async function subir(
  path: string,
  localFile: string,
  contentType = "video/mp4",
): Promise<void> {
  const buf = await readFile(localFile);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`No se pudo subir ${path}: ${error.message}`);
}

export function urlPublica(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borra un archivo del bucket (idempotente: no falla si ya no está). */
export async function borrar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`No se pudo borrar ${path}: ${error.message}`);
}
