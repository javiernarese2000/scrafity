import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claimNext, setError, setListo, setProgreso } from "./db.js";
import { probeDuration, renderFromConfig } from "./render.js";
import { descargar, subir, urlPublica } from "./storage.js";

/** Procesa UN trabajo de la cola. Devuelve false si no había nada. */
export async function procesarUno(): Promise<boolean> {
  const job = await claimNext();
  if (!job) return false;

  const dir = await mkdtemp(join(tmpdir(), "render-job-"));
  const t0 = Date.now();
  console.log(`▶ render ${job.id} — ${job.titulo ?? "(sin título)"}`);
  try {
    const src = join(dir, "in.mp4");
    await descargar(job.source_path, src);

    const out = join(dir, "out.mp4");
    let last = -5;
    await renderFromConfig(src, out, job.config ?? {}, (pct) => {
      if (pct - last >= 2) {
        last = pct;
        setProgreso(job.id, pct).catch(() => {});
      }
    });

    const dur = await probeDuration(out);
    const outPath = `renders/${job.id}.mp4`;
    await subir(outPath, out);
    await setListo(job.id, outPath, urlPublica(outPath), dur);
    console.log(`✅ render ${job.id} listo en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await setError(job.id, msg).catch(() => {});
    console.error(`✗ render ${job.id}:`, msg);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  return true;
}

/** Loop de la cola: procesa de a uno (no satura), poll cada 3s. */
export function iniciarCola(): void {
  let corriendo = false;
  setInterval(async () => {
    if (corriendo) return;
    corriendo = true;
    try {
      while (await procesarUno()) {
        // drena la cola de a uno
      }
    } catch (e) {
      console.error("cola:", e);
    } finally {
      corriendo = false;
    }
  }, 3000);
  console.log("cola de render iniciada (poll 3s, concurrencia 1)");
}
