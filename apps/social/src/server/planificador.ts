"use server";

import { clientes, db, socialAccounts, socialPublications } from "@scrapify/db";
import { and, asc, eq, gte, lt } from "drizzle-orm";

import type { Plataforma } from "./cuentas";

export type ProgramadaRow = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  plataforma: Plataforma;
  socialAccountId: string | null;
  cuentaNombre: string | null;
  videoTitulo: string | null;
  caption: string | null;
  estado: string;
  programadaEn: string; // ISO
};

function mapRow(r: {
  id: string;
  clienteId: string;
  clienteNombre: string | null;
  plataforma: string;
  socialAccountId: string | null;
  cuentaNombre: string | null;
  videoTitulo: string | null;
  caption: string | null;
  estado: string;
  programadaEn: Date | null;
}): ProgramadaRow {
  return {
    id: r.id,
    clienteId: r.clienteId,
    clienteNombre: r.clienteNombre ?? "—",
    plataforma: r.plataforma as Plataforma,
    socialAccountId: r.socialAccountId,
    cuentaNombre: r.cuentaNombre,
    videoTitulo: r.videoTitulo,
    caption: r.caption,
    estado: r.estado,
    programadaEn: (r.programadaEn ?? new Date()).toISOString(),
  };
}

const SELECT = {
  id: socialPublications.id,
  clienteId: socialPublications.clienteId,
  clienteNombre: clientes.nombre,
  plataforma: socialPublications.plataforma,
  socialAccountId: socialPublications.socialAccountId,
  cuentaNombre: socialAccounts.nombre,
  videoTitulo: socialPublications.videoTitulo,
  caption: socialPublications.caption,
  estado: socialPublications.estado,
  programadaEn: socialPublications.programadaEn,
};

export async function listarProgramadas(
  desdeISO: string,
  hastaISO: string,
): Promise<ProgramadaRow[]> {
  const rows = await db
    .select(SELECT)
    .from(socialPublications)
    .leftJoin(clientes, eq(clientes.id, socialPublications.clienteId))
    .leftJoin(socialAccounts, eq(socialAccounts.id, socialPublications.socialAccountId))
    .where(
      and(
        gte(socialPublications.programadaEn, new Date(desdeISO)),
        lt(socialPublications.programadaEn, new Date(hastaISO)),
      ),
    )
    .orderBy(asc(socialPublications.programadaEn));
  return rows.map(mapRow);
}

export type CrearProgramadaInput = {
  clienteId: string;
  socialAccountId: string | null;
  plataforma: Plataforma;
  videoTitulo: string;
  caption: string;
  programadaEnISO: string;
};

export async function crearProgramada(
  input: CrearProgramadaInput,
): Promise<ProgramadaRow> {
  const [row] = await db
    .insert(socialPublications)
    .values({
      clienteId: input.clienteId,
      socialAccountId: input.socialAccountId,
      plataforma: input.plataforma,
      videoTitulo: input.videoTitulo.trim() || "Sin título",
      caption: input.caption.trim() || null,
      programadaEn: new Date(input.programadaEnISO),
      estado: "pendiente",
    })
    .returning({ id: socialPublications.id });

  const [full] = await db
    .select(SELECT)
    .from(socialPublications)
    .leftJoin(clientes, eq(clientes.id, socialPublications.clienteId))
    .leftJoin(socialAccounts, eq(socialAccounts.id, socialPublications.socialAccountId))
    .where(eq(socialPublications.id, row!.id))
    .limit(1);
  return mapRow(full!);
}

export async function moverProgramada(id: string, programadaEnISO: string) {
  await db
    .update(socialPublications)
    .set({ programadaEn: new Date(programadaEnISO), updatedAt: new Date() })
    .where(eq(socialPublications.id, id));
}

export async function actualizarProgramada(
  id: string,
  fields: {
    videoTitulo?: string;
    caption?: string;
    plataforma?: Plataforma;
    socialAccountId?: string | null;
    programadaEnISO?: string;
  },
) {
  await db
    .update(socialPublications)
    .set({
      ...(fields.videoTitulo != null ? { videoTitulo: fields.videoTitulo } : {}),
      ...(fields.caption != null ? { caption: fields.caption } : {}),
      ...(fields.plataforma ? { plataforma: fields.plataforma } : {}),
      ...(fields.socialAccountId !== undefined
        ? { socialAccountId: fields.socialAccountId }
        : {}),
      ...(fields.programadaEnISO
        ? { programadaEn: new Date(fields.programadaEnISO) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(socialPublications.id, id));
}

export async function eliminarProgramada(id: string) {
  await db.delete(socialPublications).where(eq(socialPublications.id, id));
}
