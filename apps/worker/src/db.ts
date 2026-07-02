import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false });

export type Job = {
  id: string;
  config: Record<string, unknown>;
  source_path: string;
  titulo: string | null;
  tipo: string;
};

/**
 * Toma el próximo trabajo en cola de forma atómica (FOR UPDATE SKIP LOCKED),
 * lo marca 'procesando' y lo devuelve. null si la cola está vacía.
 */
export async function claimNext(): Promise<Job | null> {
  const rows = await sql<Job[]>`
    update video_renders
       set estado = 'procesando', started_at = now(),
           intentos = intentos + 1, progreso = 0, updated_at = now()
     where id = (
       select id from video_renders
        where estado = 'en_cola'
        order by created_at
        limit 1
        for update skip locked
     )
     returning id, config, source_path, titulo, tipo`;
  return rows[0] ?? null;
}

export async function setProgreso(id: string, pct: number): Promise<void> {
  await sql`update video_renders set progreso = ${pct}, updated_at = now() where id = ${id}`;
}

/** Estado actual del job (para detectar cancelaciones durante el render). */
export async function getEstado(id: string): Promise<string | null> {
  const [r] = await sql<{ estado: string }[]>`
    select estado from video_renders where id = ${id}`;
  return r?.estado ?? null;
}

export async function setListo(
  id: string,
  outputPath: string,
  outputUrl: string,
  durSec: number,
  thumbnailUrl: string | null,
): Promise<void> {
  await sql`
    update video_renders
       set estado = 'listo', progreso = 100, output_path = ${outputPath},
           output_url = ${outputUrl}, duracion_seg = ${durSec},
           thumbnail_url = ${thumbnailUrl},
           finished_at = now(), updated_at = now()
     where id = ${id}`;
}

export async function setError(id: string, msg: string): Promise<void> {
  await sql`
    update video_renders
       set estado = 'error', error = ${msg.slice(0, 1000)},
           finished_at = now(), updated_at = now()
     where id = ${id}`;
}

// ───────────────────────── Retención de originales ─────────────────────────

/**
 * Originales (source) a borrar: renders en estado terminal, con más de `dias`
 * días y cuyo original sigue en Storage. No toca jobs activos (en_cola/
 * procesando/pausado) ni los ya limpiados.
 */
export async function sourcesParaLimpiar(
  dias: number,
): Promise<{ id: string; source_path: string }[]> {
  return sql<{ id: string; source_path: string }[]>`
    select id, source_path
      from video_renders
     where source_eliminado = false
       and estado in ('listo', 'error', 'cancelado')
       and created_at < now() - make_interval(days => ${dias})
     limit 200`;
}

export async function marcarSourceEliminado(id: string): Promise<void> {
  await sql`
    update video_renders
       set source_eliminado = true, updated_at = now()
     where id = ${id}`;
}
