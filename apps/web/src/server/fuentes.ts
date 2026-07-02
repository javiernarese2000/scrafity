"use server";

import {
  db,
  type FuenteProgreso,
  ingestRuns,
  sources,
} from "@scrapify/db";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { ingestarFuentes } from "./ingesta";

export type FuenteTipo = "rss" | "api" | "url";
export type FuenteEstado = "activa" | "pausada" | "error";

export async function createFuente(input: {
  nombre: string;
  tipo: FuenteTipo;
  url: string;
  categoria?: string | null;
}) {
  await db.insert(sources).values({
    nombre: input.nombre,
    tipo: input.tipo,
    url: input.url,
    categoria: input.categoria || null,
  });
  revalidatePath("/fuentes");
}

export async function setFuenteCategoria(id: string, categoria: string | null) {
  await db
    .update(sources)
    .set({ categoria: categoria || null, updatedAt: new Date() })
    .where(eq(sources.id, id));
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

export type EstadoIngesta = {
  id: string;
  estado: "corriendo" | "completado" | "error";
  nuevas: number;
  generadas: number;
  saltadas: number;
  errores: string[];
  fuentes: FuenteProgreso[];
  startedAt: string;
  finishedAt: string | null;
};

function aEstado(r: typeof ingestRuns.$inferSelect): EstadoIngesta {
  return {
    id: r.id,
    estado: r.estado as EstadoIngesta["estado"],
    nuevas: r.nuevas,
    generadas: r.generadas,
    saltadas: r.saltadas,
    errores: r.errores,
    fuentes: r.fuentes,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  };
}

/**
 * Inicia la ingesta en segundo plano y devuelve el id de la corrida para
 * seguir el progreso. Si ya hay una corriendo, devuelve esa (no duplica).
 */
export async function iniciarIngesta(opts?: {
  sourceIds?: string[];
  categorias?: string[];
  maxPorFuente?: number;
  palabra?: string;
}): Promise<{ runId: string }> {
  const [enCurso] = await db
    .select()
    .from(ingestRuns)
    .where(eq(ingestRuns.estado, "corriendo"))
    .limit(1);
  if (enCurso) return { runId: enCurso.id };

  const [run] = await db.insert(ingestRuns).values({}).returning();
  // Fire-and-forget: el server (Node) sigue ejecutando tras responder.
  void ingestarFuentes({ runId: run!.id, ...opts }).catch(async (e) => {
    await db
      .update(ingestRuns)
      .set({
        estado: "error",
        errores: [e instanceof Error ? e.message : "fallo la ingesta"],
        finishedAt: new Date(),
      })
      .where(eq(ingestRuns.id, run!.id));
  });
  return { runId: run!.id };
}

/** Estado de una corrida (para el panel en vivo). */
export async function estadoIngesta(runId: string): Promise<EstadoIngesta | null> {
  const [r] = await db
    .select()
    .from(ingestRuns)
    .where(eq(ingestRuns.id, runId))
    .limit(1);
  return r ? aEstado(r) : null;
}

/** Última corrida (para mostrar al cargar la página). */
export async function ultimaIngesta(): Promise<EstadoIngesta | null> {
  const [r] = await db
    .select()
    .from(ingestRuns)
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);
  return r ? aEstado(r) : null;
}
