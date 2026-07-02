"use server";

import { db, destinations, publications, versions } from "@scrapify/db";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { despachar, publicarItem } from "./despachador";

export type CalendarioEvento = {
  id: string;
  fecha: string; // ISO — programadaEn si está en cola; si no, cuándo se publicó
  estado: "en_cola" | "publicada" | "error" | "pendiente";
  titulo: string | null;
  categoria: string | null;
  destinoId: string;
  destinoNombre: string | null;
  urlPublicada: string | null;
};

export type SinProgramarRow = {
  id: string;
  titulo: string | null;
  categoria: string | null;
  destinoId: string;
  destinoNombre: string | null;
};

/** Publicaciones para pintar en el calendario dentro del rango [desde, hasta). */
export async function listarCalendario(
  desdeISO: string,
  hastaISO: string,
): Promise<CalendarioEvento[]> {
  const desde = new Date(desdeISO);
  const hasta = new Date(hastaISO);

  const rows = await db
    .select({
      id: publications.id,
      estado: publications.estado,
      programadaEn: publications.programadaEn,
      updatedAt: publications.updatedAt,
      categoria: publications.categoria,
      urlPublicada: publications.urlPublicada,
      destinoId: publications.destinationId,
      destinoNombre: destinations.nombre,
      titulo: versions.titulo,
    })
    .from(publications)
    .leftJoin(destinations, eq(destinations.id, publications.destinationId))
    .leftJoin(versions, eq(versions.id, publications.versionId))
    .where(
      or(
        // Programadas en cola (o con error) que caen en la ventana.
        and(
          eq(publications.estado, "en_cola"),
          gte(publications.programadaEn, desde),
          lte(publications.programadaEn, hasta),
        ),
        and(
          eq(publications.estado, "error"),
          gte(publications.programadaEn, desde),
          lte(publications.programadaEn, hasta),
        ),
        // Ya publicadas: se muestran en el día que salieron (pasado = biblioteca).
        and(
          eq(publications.estado, "publicada"),
          gte(publications.updatedAt, desde),
          lte(publications.updatedAt, hasta),
        ),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    fecha: (r.programadaEn ?? r.updatedAt).toISOString(),
    estado: r.estado,
    titulo: r.titulo,
    categoria: r.categoria,
    destinoId: r.destinoId,
    destinoNombre: r.destinoNombre,
    urlPublicada: r.urlPublicada,
  }));
}

/** Cola sin fecha asignada: el "backlog" para arrastrar al calendario. */
export async function listarSinProgramar(): Promise<SinProgramarRow[]> {
  const rows = await db
    .select({
      id: publications.id,
      titulo: versions.titulo,
      categoria: publications.categoria,
      destinoId: publications.destinationId,
      destinoNombre: destinations.nombre,
    })
    .from(publications)
    .leftJoin(destinations, eq(destinations.id, publications.destinationId))
    .leftJoin(versions, eq(versions.id, publications.versionId))
    .where(
      and(eq(publications.estado, "en_cola"), isNull(publications.programadaEn)),
    );
  return rows;
}

/** Fija/mueve la fecha programada. Vuelve a 'en_cola' por si venía de error. */
export async function reprogramar(pubId: string, fechaISO: string) {
  await db
    .update(publications)
    .set({ estado: "en_cola", programadaEn: new Date(fechaISO), error: null, updatedAt: new Date() })
    .where(eq(publications.id, pubId));
  revalidatePath("/calendario");
}

/** Quita la fecha: vuelve al despacho por cadencia (o inmediato). */
export async function desprogramar(pubId: string) {
  await db
    .update(publications)
    .set({ programadaEn: null, updatedAt: new Date() })
    .where(eq(publications.id, pubId));
  revalidatePath("/calendario");
}

/** Publica ya, sin esperar la hora programada. */
export async function publicarAhora(pubId: string): Promise<{ ok: boolean; error?: string }> {
  const r = await publicarItem(pubId);
  revalidatePath("/calendario");
  return r;
}

/** Saca la publicación del calendario y de la cola. */
export async function quitarDelCalendario(pubId: string) {
  await db.delete(publications).where(eq(publications.id, pubId));
  revalidatePath("/calendario");
}

/**
 * Corre el despachador ahora (igual que el cron): suelta las programadas cuya
 * hora ya venció y las de la cola por cadencia. Útil para probar en local.
 */
export async function despacharProgramadas() {
  const r = await despachar();
  revalidatePath("/calendario");
  return r;
}
