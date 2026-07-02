import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claimNext, getEstado, setError, setListo, setProgreso } from "./db.js";
import {
  CanceladoError,
  extractThumbnail,
  probeDuration,
  renderFromConfig,
  renderImageFromConfig,
} from "./render.js";
import { descargar, subir, urlPublica } from "./storage.js";

/** Slug seguro para nombres de archivo (sin acentos ni símbolos). */
function slugify(s: string | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

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

  const esImagen = job.tipo === "imagen";
  console.log(`▶ render ${job.id} [${job.tipo}] — ${job.titulo ?? "(sin título)"}`);
  try {
    const srcExt =
      job.source_path.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 5) ||
      (esImagen ? "jpg" : "mp4");
    const src = join(dir, `in.${srcExt}`);
    await descargar(job.source_path, src);

    const ext = esImagen ? "jpg" : "mp4";
    const out = join(dir, `out.${ext}`);

    if (esImagen) {
      await renderImageFromConfig(src, out, job.config ?? {});
    } else {
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
    }

    // Resultado y miniatura van a la misma carpeta del source (<cliente>/<mes>/).
    const carpeta = job.source_path.replace(/\/src\/[^/]+$/, "");
    const nuevaRuta = carpeta !== job.source_path;
    const id6 = job.id.slice(0, 6);
    const nombre = `${slugify(job.titulo) || "media"}-${id6}`;
    const outPath = nuevaRuta ? `${carpeta}/out/${nombre}.${ext}` : `renders/${job.id}.${ext}`;

    await subir(outPath, out, esImagen ? "image/jpeg" : "video/mp4");
    const outputUrl = urlPublica(outPath);

    // Miniatura: en imagen es el mismo resultado; en video, un frame.
    let thumbUrl: string | null = esImagen ? outputUrl : null;
    if (!esImagen) {
      try {
        const thumb = join(dir, "thumb.jpg");
        await extractThumbnail(out, thumb);
        const thumbPath = nuevaRuta ? `${carpeta}/thumb/${nombre}.jpg` : `thumbs/${job.id}.jpg`;
        await subir(thumbPath, thumb, "image/jpeg");
        thumbUrl = urlPublica(thumbPath);
      } catch {
        // una miniatura que falla no debe frenar el render
      }
    }

    const dur = esImagen ? 0 : await probeDuration(out);
    await setListo(job.id, outPath, outputUrl, dur, thumbUrl);
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
