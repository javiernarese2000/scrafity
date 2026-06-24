"use server";

import {
  articles,
  db,
  escenarioDestinos,
  escenarios,
  versions,
} from "@scrapify/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ProviderName } from "@/ai";
import { enviarACola } from "./cola";
import { generarVersionesCore, type GenerarParams } from "./generar";

/** Params de generación según el escenario que matcheó (o defaults). */
async function paramsDeEscenario(escenarioId: string | null): Promise<GenerarParams> {
  const base: GenerarParams = {
    nVersiones: 1,
    tono: "Neutro",
    proveedor: "auto",
    escenarioId,
  };
  if (!escenarioId) return base;
  const [esc] = await db
    .select()
    .from(escenarios)
    .where(eq(escenarios.id, escenarioId))
    .limit(1);
  if (!esc) return base;
  return {
    nVersiones: esc.nVersiones,
    tono: esc.tono,
    proveedor: esc.proveedor as ProviderName | "auto",
    escenarioId: esc.id,
  };
}

async function destinosDeEscenario(escenarioId: string): Promise<string[]> {
  const rows = await db
    .select({ id: escenarioDestinos.destinationId })
    .from(escenarioDestinos)
    .where(eq(escenarioDestinos.escenarioId, escenarioId));
  return rows.map((r) => r.id);
}

/**
 * Genera la nota y, si corresponde (escenario con moderación=off, o forzado),
 * la AUTO-ENCOLA en la bandeja de los destinos del escenario en vez de mandarla
 * a Moderación. En auto se fuerza 1 versión. Si no hay destinos, queda en
 * Moderación (fallback de seguridad).
 */
async function procesar(
  articleId: string,
  escenarioId: string | null,
  forzarBandeja: boolean,
): Promise<void> {
  let moderacion = true;
  let params = await paramsDeEscenario(escenarioId);
  let destinos: string[] = [];

  if (escenarioId) {
    const [esc] = await db
      .select({ moderacion: escenarios.moderacion })
      .from(escenarios)
      .where(eq(escenarios.id, escenarioId))
      .limit(1);
    moderacion = esc?.moderacion ?? true;
    destinos = await destinosDeEscenario(escenarioId);
  }

  const autoRoute = forzarBandeja || !moderacion;
  if (autoRoute) params = { ...params, nVersiones: 1 };

  await generarVersionesCore(articleId, params);

  if (autoRoute && destinos.length > 0) {
    const [v] = await db
      .select({ id: versions.id })
      .from(versions)
      .where(and(eq(versions.articleId, articleId), eq(versions.estado, "en_revision")))
      .orderBy(desc(versions.createdAt))
      .limit(1);
    if (v) {
      await enviarACola(
        articleId,
        destinos.map((d) => ({ destinationId: d, versionId: v.id, imagenUrl: null })),
      );
    }
  }
}

type Tarea = { id: string; escenarioId: string | null; forzar: boolean };

/** Procesa de a UNA en segundo plano (concurrencia 1, respeta el rate limit). */
function procesarEnFondo(tareas: Tarea[]) {
  void (async () => {
    for (const t of tareas) {
      try {
        await procesar(t.id, t.escenarioId, t.forzar);
      } catch {
        // El error queda registrado en el rewrite_job.
      }
    }
  })();
}

async function marcarAprobada(articleId: string): Promise<string | null | undefined> {
  const [art] = await db
    .select({ escenarioId: articles.escenarioId, curacion: articles.curacion })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!art || art.curacion !== "pendiente") return undefined;
  await db
    .update(articles)
    .set({ curacion: "aprobada", updatedAt: new Date() })
    .where(eq(articles.id, articleId));
  return art.escenarioId;
}

function revalidarAprobacion() {
  revalidatePath("/curaduria");
  revalidatePath("/biblioteca");
  revalidatePath("/moderacion");
  revalidatePath("/bandeja");
}

/**
 * Aprueba una nota cruda. Respeta el escenario: si tiene moderación=off, la nota
 * va sola a la Bandeja; si no, a Moderación. La generación corre en segundo plano.
 */
export async function aprobarIngesta(articleId: string) {
  const escenarioId = await marcarAprobada(articleId);
  if (escenarioId === undefined) return;
  procesarEnFondo([{ id: articleId, escenarioId, forzar: false }]);
  revalidarAprobacion();
}

export async function aprobarVarias(ids: string[]) {
  const tareas: Tarea[] = [];
  for (const id of ids) {
    const escenarioId = await marcarAprobada(id);
    if (escenarioId === undefined) continue;
    tareas.push({ id, escenarioId, forzar: false });
  }
  revalidarAprobacion();
  procesarEnFondo(tareas);
}

/** Aprueba y manda DIRECTO a la bandeja (saltea Moderación aunque el escenario la pida). */
export async function aprobarYEnviar(articleId: string) {
  const escenarioId = await marcarAprobada(articleId);
  if (escenarioId === undefined) return;
  procesarEnFondo([{ id: articleId, escenarioId, forzar: true }]);
  revalidarAprobacion();
}

export async function aprobarVariasYEnviar(ids: string[]) {
  const tareas: Tarea[] = [];
  for (const id of ids) {
    const escenarioId = await marcarAprobada(id);
    if (escenarioId === undefined) continue;
    tareas.push({ id, escenarioId, forzar: true });
  }
  revalidarAprobacion();
  procesarEnFondo(tareas);
}

/**
 * Reintenta/rehace la generación de una nota. Sirve para huérfanas (job en
 * error / sin versiones) y para reprocesar notas con similitud alta. Descarta
 * los borradores `en_revision` (se reemplazan) y deja intactas las publicadas.
 */
export async function regenerar(articleId: string) {
  const [art] = await db
    .select({ escenarioId: articles.escenarioId, curacion: articles.curacion })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!art) return;

  if (art.curacion !== "aprobada") {
    await db
      .update(articles)
      .set({ curacion: "aprobada", updatedAt: new Date() })
      .where(eq(articles.id, articleId));
  }

  await db
    .update(versions)
    .set({ estado: "rechazada", updatedAt: new Date() })
    .where(
      and(eq(versions.articleId, articleId), eq(versions.estado, "en_revision")),
    );

  const params = await paramsDeEscenario(art.escenarioId);
  void generarVersionesCore(articleId, params).catch(() => {});
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${articleId}`);
  revalidatePath("/moderacion");
}

/** Descarta una nota cruda: nunca se genera ni publica. */
export async function descartarIngesta(articleId: string) {
  await db
    .update(articles)
    .set({ curacion: "descartada", updatedAt: new Date() })
    .where(eq(articles.id, articleId));
  revalidatePath("/curaduria");
}

export async function descartarVarias(ids: string[]) {
  if (ids.length === 0) return;
  await db
    .update(articles)
    .set({ curacion: "descartada", updatedAt: new Date() })
    .where(inArray(articles.id, ids));
  revalidatePath("/curaduria");
}
