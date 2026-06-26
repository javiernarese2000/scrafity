import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false });

export type Job = {
  id: string;
  config: Record<string, unknown>;
  source_path: string;
  titulo: string | null;
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
     returning id, config, source_path, titulo`;
  return rows[0] ?? null;
}

export async function setProgreso(id: string, pct: number): Promise<void> {
  await sql`update video_renders set progreso = ${pct}, updated_at = now() where id = ${id}`;
}

export async function setListo(
  id: string,
  outputPath: string,
  outputUrl: string,
  durSec: number,
): Promise<void> {
  await sql`
    update video_renders
       set estado = 'listo', progreso = 100, output_path = ${outputPath},
           output_url = ${outputUrl}, duracion_seg = ${durSec},
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
