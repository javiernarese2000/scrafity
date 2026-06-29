"use server";

import { db, socialAuditLog } from "@scrapify/db";
import { desc } from "drizzle-orm";

import { registrar } from "@/lib/auditoria";

export type AuditRow = {
  id: string;
  actorEmail: string | null;
  actorNombre: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  resumen: string;
  meta: Record<string, unknown> | null;
  resultado: string;
  error: string | null;
  createdAt: string;
};

export async function listarAuditoria(): Promise<AuditRow[]> {
  const rows = await db
    .select({
      id: socialAuditLog.id,
      actorEmail: socialAuditLog.actorEmail,
      actorNombre: socialAuditLog.actorNombre,
      accion: socialAuditLog.accion,
      entidad: socialAuditLog.entidad,
      entidadId: socialAuditLog.entidadId,
      resumen: socialAuditLog.resumen,
      meta: socialAuditLog.meta,
      resultado: socialAuditLog.resultado,
      error: socialAuditLog.error,
      createdAt: socialAuditLog.createdAt,
    })
    .from(socialAuditLog)
    .orderBy(desc(socialAuditLog.createdAt))
    .limit(500);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Lo llama la pantalla de login tras un inicio de sesión exitoso. */
export async function registrarLogin(): Promise<void> {
  await registrar({ accion: "auth.login", entidad: "auth", resumen: "Inició sesión" });
}
