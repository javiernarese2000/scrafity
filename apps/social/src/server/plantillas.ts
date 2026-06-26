"use server";

import { db, plantillas } from "@scrapify/db";
import { desc, eq } from "drizzle-orm";

export type PlantillaRow = {
  id: string;
  nombre: string;
  clienteId: string | null;
  config: Record<string, unknown>;
};

export async function listarPlantillas(): Promise<PlantillaRow[]> {
  const rows = await db
    .select({
      id: plantillas.id,
      nombre: plantillas.nombre,
      clienteId: plantillas.clienteId,
      config: plantillas.config,
    })
    .from(plantillas)
    .orderBy(desc(plantillas.createdAt));
  return rows.map((r) => ({ ...r, config: r.config ?? {} }));
}

export async function crearPlantilla(
  nombre: string,
  clienteId: string | null,
  config: Record<string, unknown>,
): Promise<PlantillaRow> {
  const n = nombre.trim();
  if (!n) throw new Error("Poné un nombre a la plantilla.");
  const [row] = await db
    .insert(plantillas)
    .values({ nombre: n, clienteId, config })
    .returning();
  return {
    id: row!.id,
    nombre: row!.nombre,
    clienteId: row!.clienteId,
    config: row!.config ?? {},
  };
}

export async function eliminarPlantilla(id: string) {
  await db.delete(plantillas).where(eq(plantillas.id, id));
}
