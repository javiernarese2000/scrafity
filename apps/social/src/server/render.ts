"use server";

import { clientes, db, socialAccounts, socialPublications, videoRenders } from "@scrapify/db";
import { createClient } from "@supabase/supabase-js";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Slug seguro para nombres de archivo / carpetas (sin acentos ni símbolos). */
function slug(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * URL firmada para subir el video directo a Storage. Los archivos se organizan
 * por cliente y mes con nombres legibles:
 *   <cliente-slug>--<id8>/<YYYY-MM>/src/<titulo-slug>-<rnd6>.<ext>
 * El worker deja el resultado y la miniatura en esa misma carpeta (out/ y thumb/).
 */
export async function prepararSubida(input: {
  ext: string;
  clienteId: string | null;
  titulo?: string;
}): Promise<{ path: string; token: string }> {
  const ext = input.ext.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";

  let carpeta = "sin-cliente";
  if (input.clienteId) {
    const [c] = await db
      .select({ nombre: clientes.nombre })
      .from(clientes)
      .where(eq(clientes.id, input.clienteId))
      .limit(1);
    carpeta = `${slug(c?.nombre ?? "") || "cliente"}--${input.clienteId.slice(0, 8)}`;
  }
  const mes = new Date().toISOString().slice(0, 7); // YYYY-MM
  const nombre = `${slug(input.titulo ?? "") || "video"}-${crypto.randomUUID().slice(0, 6)}.${ext}`;
  const path = `${carpeta}/${mes}/src/${nombre}`;

  const { data, error } = await admin()
    .storage.from("videos")
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error("No se pudo preparar la subida: " + (error?.message ?? ""));
  }
  return { path, token: data.token };
}

export async function encolarRender(input: {
  sourcePath: string;
  titulo: string;
  clienteId: string | null;
  config: Record<string, unknown>;
}): Promise<string> {
  const [row] = await db
    .insert(videoRenders)
    .values({
      clienteId: input.clienteId,
      titulo: input.titulo.trim() || "Sin título",
      config: input.config,
      sourcePath: input.sourcePath,
      estado: "en_cola",
    })
    .returning({ id: videoRenders.id });
  await registrar({
    accion: "render.crear",
    entidad: "render",
    entidadId: row!.id,
    resumen: `Envió a render "${input.titulo.trim() || "Sin título"}"`,
    meta: { clienteId: input.clienteId },
  });
  return row!.id;
}

export type EstadoRender = {
  estado: string;
  progreso: number;
  outputUrl: string | null;
  duracionSeg: number | null;
  error: string | null;
  posicion: number; // lugar en la cola (1 = siguiente); 0 si no está en cola
};

export async function estadoRender(id: string): Promise<EstadoRender | null> {
  const [r] = await db
    .select({
      estado: videoRenders.estado,
      progreso: videoRenders.progreso,
      outputUrl: videoRenders.outputUrl,
      duracionSeg: videoRenders.duracionSeg,
      error: videoRenders.error,
      createdAt: videoRenders.createdAt,
    })
    .from(videoRenders)
    .where(eq(videoRenders.id, id))
    .limit(1);
  if (!r) return null;

  let posicion = 0;
  if (r.estado === "en_cola") {
    const [c] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(videoRenders)
      .where(
        and(eq(videoRenders.estado, "en_cola"), lt(videoRenders.createdAt, r.createdAt)),
      );
    posicion = (c?.n ?? 0) + 1;
  }

  return {
    estado: r.estado,
    progreso: r.progreso,
    outputUrl: r.outputUrl,
    duracionSeg: r.duracionSeg,
    error: r.error,
    posicion,
  };
}

// ───────────────────────── Panel de la cola ─────────────────────────

export type RenderRow = {
  id: string;
  titulo: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  estado: string;
  progreso: number;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  duracionSeg: number | null;
  error: string | null;
  sourceEliminado: boolean;
  createdAt: string;
};

export async function listarRenders(): Promise<RenderRow[]> {
  const rows = await db
    .select({
      id: videoRenders.id,
      titulo: videoRenders.titulo,
      clienteId: videoRenders.clienteId,
      clienteNombre: clientes.nombre,
      estado: videoRenders.estado,
      progreso: videoRenders.progreso,
      outputUrl: videoRenders.outputUrl,
      thumbnailUrl: videoRenders.thumbnailUrl,
      duracionSeg: videoRenders.duracionSeg,
      error: videoRenders.error,
      sourceEliminado: videoRenders.sourceEliminado,
      createdAt: videoRenders.createdAt,
    })
    .from(videoRenders)
    .leftJoin(clientes, eq(clientes.id, videoRenders.clienteId))
    .orderBy(desc(videoRenders.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function pausarRender(id: string) {
  await db
    .update(videoRenders)
    .set({ estado: "pausado", updatedAt: new Date() })
    .where(and(eq(videoRenders.id, id), eq(videoRenders.estado, "en_cola")));
  revalidatePath("/renders");
}

export async function reanudarRender(id: string) {
  await db
    .update(videoRenders)
    .set({ estado: "en_cola", updatedAt: new Date() })
    .where(and(eq(videoRenders.id, id), eq(videoRenders.estado, "pausado")));
  revalidatePath("/renders");
}

export async function cancelarRender(id: string) {
  await db
    .update(videoRenders)
    .set({ estado: "cancelado", finishedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(videoRenders.id, id),
        inArray(videoRenders.estado, ["en_cola", "pausado", "procesando"]),
      ),
    );
  revalidatePath("/renders");
}

export async function reintentarRender(id: string) {
  await db
    .update(videoRenders)
    .set({
      estado: "en_cola",
      progreso: 0,
      error: null,
      startedAt: null,
      finishedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoRenders.id, id),
        inArray(videoRenders.estado, ["error", "cancelado"]),
      ),
    );
  revalidatePath("/renders");
}

export async function eliminarRender(id: string) {
  await db.delete(videoRenders).where(eq(videoRenders.id, id));
  revalidatePath("/renders");
}

// ───────────────────────── Armar publicación ─────────────────────────

/**
 * Arma la publicación a redes a partir de un render listo: una fila de
 * social_publications por cada cuenta elegida, con el video, el caption y la
 * hora (ahora o programada). Quedan en estado "en_cola" para que el despachador
 * las mande cuando esté el OAuth de Meta/TikTok; mientras tanto se ven en la
 * Agenda y en Publicaciones.
 */
export async function publicarRender(input: {
  renderId: string;
  cuentaIds: string[];
  caption: string;
  programadaEn: string | null; // ISO; null = ahora
}): Promise<number> {
  if (!input.cuentaIds.length) throw new Error("Elegí al menos una cuenta.");

  const [r] = await db
    .select({
      clienteId: videoRenders.clienteId,
      titulo: videoRenders.titulo,
      outputUrl: videoRenders.outputUrl,
      estado: videoRenders.estado,
    })
    .from(videoRenders)
    .where(eq(videoRenders.id, input.renderId))
    .limit(1);
  if (!r) throw new Error("No existe el render.");
  if (r.estado !== "listo" || !r.outputUrl)
    throw new Error("El render todavía no está listo.");

  const cuentas = await db
    .select({
      id: socialAccounts.id,
      clienteId: socialAccounts.clienteId,
      plataforma: socialAccounts.plataforma,
    })
    .from(socialAccounts)
    .where(inArray(socialAccounts.id, input.cuentaIds));
  if (!cuentas.length) throw new Error("No se encontraron las cuentas.");

  const cuando = input.programadaEn ? new Date(input.programadaEn) : new Date();

  await db.insert(socialPublications).values(
    cuentas.map((c) => ({
      clienteId: c.clienteId,
      socialAccountId: c.id,
      plataforma: c.plataforma,
      videoRenderId: input.renderId,
      videoUrl: r.outputUrl,
      videoTitulo: r.titulo,
      caption: input.caption.trim() || null,
      estado: "en_cola" as const,
      programadaEn: cuando,
    })),
  );

  await registrar({
    accion: "publicacion.armar",
    entidad: "render",
    entidadId: input.renderId,
    resumen: `Armó la publicación de "${r.titulo ?? "video"}" para ${cuentas.length} cuenta(s)${input.programadaEn ? " (programada)" : ""}`,
    meta: { cuentas: cuentas.length, programadaEn: input.programadaEn },
  });

  revalidatePath("/renders");
  revalidatePath("/agenda");
  revalidatePath("/publicaciones");
  return cuentas.length;
}
