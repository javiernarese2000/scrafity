import { db, socialAuditLog } from "@scrapify/db";

import { createClient } from "@/lib/supabase/server";

type Actor = { id?: string | null; email?: string | null; nombre?: string | null };

type Evento = {
  accion: string;
  entidad?: string;
  entidadId?: string | null;
  resumen: string;
  meta?: Record<string, unknown>;
  resultado?: "ok" | "error";
  error?: string | null;
  /** "sistema" para acciones del worker/cron; si se omite, se toma de la sesión. */
  actor?: Actor | "sistema";
};

/**
 * Registra un evento en la bitácora. Nunca lanza: una falla de auditoría no
 * debe romper la acción que la disparó. Si no hay sesión → actor "Sistema".
 */
export async function registrar(e: Evento): Promise<void> {
  try {
    let actorId: string | null = null;
    let actorEmail: string | null = "Sistema";
    let actorNombre: string | null = null;

    if (e.actor === "sistema") {
      // queda como Sistema
    } else if (e.actor) {
      actorId = e.actor.id ?? null;
      actorEmail = e.actor.email ?? "Sistema";
      actorNombre = e.actor.nombre ?? null;
    } else {
      const sb = await createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) {
        actorId = user.id;
        actorEmail = user.email ?? null;
        const m = (user.user_metadata ?? {}) as Record<string, unknown>;
        actorNombre = typeof m.nombre === "string" ? m.nombre : null;
      }
    }

    await db.insert(socialAuditLog).values({
      actorId,
      actorEmail,
      actorNombre,
      accion: e.accion,
      entidad: e.entidad ?? null,
      entidadId: e.entidadId ?? null,
      resumen: e.resumen,
      meta: e.meta ?? null,
      resultado: e.resultado ?? "ok",
      error: e.error ?? null,
    });
  } catch (err) {
    console.error("audit registrar:", err);
  }
}
