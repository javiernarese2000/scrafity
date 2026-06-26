"use server";

import { clientes, db, socialPublications } from "@scrapify/db";
import { desc, eq } from "drizzle-orm";

import type { Plataforma } from "./cuentas";

export type EstadoPub = "pendiente" | "en_cola" | "publicada" | "error";

export type PublicacionRow = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  plataforma: Plataforma;
  videoTitulo: string | null;
  caption: string | null;
  estado: EstadoPub;
  urlPublicada: string | null;
  publicadaEn: Date | null;
  createdAt: Date;
};

export async function listarPublicaciones(): Promise<PublicacionRow[]> {
  const rows = await db
    .select({
      id: socialPublications.id,
      clienteId: socialPublications.clienteId,
      clienteNombre: clientes.nombre,
      plataforma: socialPublications.plataforma,
      videoTitulo: socialPublications.videoTitulo,
      caption: socialPublications.caption,
      estado: socialPublications.estado,
      urlPublicada: socialPublications.urlPublicada,
      publicadaEn: socialPublications.publicadaEn,
      createdAt: socialPublications.createdAt,
    })
    .from(socialPublications)
    .leftJoin(clientes, eq(clientes.id, socialPublications.clienteId))
    .orderBy(desc(socialPublications.createdAt));

  return rows.map((r) => ({
    ...r,
    clienteNombre: r.clienteNombre ?? "—",
    plataforma: r.plataforma as Plataforma,
    estado: r.estado as EstadoPub,
  }));
}
