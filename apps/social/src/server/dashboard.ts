import { clientes, db, socialAccounts, socialPublications } from "@scrapify/db";
import { desc, eq, sql } from "drizzle-orm";

import type { Plataforma } from "./cuentas";
import type { EstadoPub } from "./publicaciones";

export type RecienteRow = {
  id: string;
  clienteNombre: string;
  plataforma: Plataforma;
  videoTitulo: string | null;
  estado: EstadoPub;
  fecha: Date;
};

export type ResumenRedes = {
  clientes: number;
  cuentas: number;
  cuentasConectadas: number;
  totalPubs: number;
  porEstado: Record<EstadoPub, number>;
  porPlataforma: Record<Plataforma, number>;
  recientes: RecienteRow[];
};

const N = sql<number>`count(*)::int`;

export async function getResumenRedes(): Promise<ResumenRedes> {
  const [cli, acc, accConn, est, plat, recientes] = await Promise.all([
    db.select({ n: N }).from(clientes),
    db.select({ n: N }).from(socialAccounts),
    db
      .select({ n: N })
      .from(socialAccounts)
      .where(eq(socialAccounts.estado, "conectada")),
    db
      .select({ estado: socialPublications.estado, n: N })
      .from(socialPublications)
      .groupBy(socialPublications.estado),
    db
      .select({ plataforma: socialPublications.plataforma, n: N })
      .from(socialPublications)
      .groupBy(socialPublications.plataforma),
    db
      .select({
        id: socialPublications.id,
        clienteNombre: clientes.nombre,
        plataforma: socialPublications.plataforma,
        videoTitulo: socialPublications.videoTitulo,
        estado: socialPublications.estado,
        publicadaEn: socialPublications.publicadaEn,
        createdAt: socialPublications.createdAt,
      })
      .from(socialPublications)
      .leftJoin(clientes, eq(clientes.id, socialPublications.clienteId))
      .orderBy(desc(socialPublications.createdAt))
      .limit(6),
  ]);

  const porEstado: Record<EstadoPub, number> = {
    pendiente: 0,
    en_cola: 0,
    publicando: 0,
    publicada: 0,
    error: 0,
  };
  est.forEach((r) => (porEstado[r.estado as EstadoPub] = r.n));

  const porPlataforma: Record<Plataforma, number> = {
    instagram: 0,
    facebook: 0,
    tiktok: 0,
  };
  plat.forEach((r) => (porPlataforma[r.plataforma as Plataforma] = r.n));

  return {
    clientes: cli[0]?.n ?? 0,
    cuentas: acc[0]?.n ?? 0,
    cuentasConectadas: accConn[0]?.n ?? 0,
    totalPubs: est.reduce((s, r) => s + r.n, 0),
    porEstado,
    porPlataforma,
    recientes: recientes.map((r) => ({
      id: r.id,
      clienteNombre: r.clienteNombre ?? "—",
      plataforma: r.plataforma as Plataforma,
      videoTitulo: r.videoTitulo,
      estado: r.estado as EstadoPub,
      fecha: r.publicadaEn ?? r.createdAt,
    })),
  };
}
