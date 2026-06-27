import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claimNext, getEstado, setError, setListo, setProgreso } from "./db.js";
import {
  CanceladoError,
  extractThumbnail,
  probeDuration,
  renderFromConfig,
} from "./render.js";
import { descargar, subir, urlPublica } from "./storage.js";

/** Procesa UN trabajo de la cola. Devuelve false si no había nada. */
export async function procesarUno(): Promise<boolean> {
  const job = await claimNext();
  if (!job) return false;

  const dir = await mkdtemp(join(tmpdir(), "render-job-"));
  const t0 = Date.now();
  const controller = new AbortController();

  // Detección de cancelación: si el estado deja de ser 'procesando' (el usuario
  // canceló desde el panel), abortamos el ffmpeg.
  const watch = setInterval(async () => {
    const est = await getEstado(job.id).catch(() => null);
    if (est && est !== "procesando") controller.abort();
  }, 2000);

  console.log(`▶ render ${job.id} — ${job.titulo ?? "(sin título)"}`);
  try {
    const src = join(dir, "in.mp4");
    await descargar(job.source_path, src);

    const out = join(dir, "out.mp4");
    let last = -5;
    await renderFromConfig(
      src,
      out,
      job.config ?? {},
      (pct) => {
        if (pct - last >= 2) {
          last = pct;
          setProgreso(job.id, pct).catch(() => {});
        }
      },
      controller.signal,
    );

    // Miniatura
    let thumbUrl: string | null = null;
    try {
      const thumb = join(dir, "thumb.jpg");
      await extractThumbnail(out, thumb);
      const thumbPath = `thumbs/${job.id}.jpg`;
      await subir(thumbPath, thumb, "image/jpeg");
      thumbUrl = urlPublica(thumbPath);
    } catch {
      // una miniatura que falla no debe frenar el render
    }

    const dur = await probeDuration(out);
    const outPath = `renders/${job.id}.mp4`;
    await subir(outPath, out);
    await setListo(job.id, outPath, urlPublica(outPath), dur, thumbUrl);
    console.log(`✅ render ${job.id} listo en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    if (e instanceof CanceladoError) {
      console.log(`⏹ render ${job.id} cancelado`);
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      await setError(job.id, msg).catch(() => {});
      console.error(`✗ render ${job.id}:`, msg);
    }
  } finally {
    clearInterval(watch);
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
