"use server";

import { db, sources } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type FuenteTipo = "rss" | "api" | "url";
export type FuenteEstado = "activa" | "pausada" | "error";

export async function createFuente(input: {
  nombre: string;
  tipo: FuenteTipo;
  url: string;
}) {
  await db.insert(sources).values({
    nombre: input.nombre,
    tipo: input.tipo,
    url: input.url,
  });
  revalidatePath("/fuentes");
}

export async function setFuenteEstado(id: string, estado: FuenteEstado) {
  await db
    .update(sources)
    .set({ estado, updatedAt: new Date() })
    .where(eq(sources.id, id));
  revalidatePath("/fuentes");
}

export async function deleteFuente(id: string) {
  await db.delete(sources).where(eq(sources.id, id));
  revalidatePath("/fuentes");
}
