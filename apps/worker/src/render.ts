import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildOverlayHtml, renderOverlayHtml } from "./overlay.js";

const DIMS: Record<string, [number, number]> = {
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
};

/** Redondea a entero par (FFmpeg / yuv420p exige dimensiones pares). */
function even(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r - 1;
}

/** "#rrggbb" → "0xrrggbb" para los sources de color de FFmpeg. */
function ffColor(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? `0x${m[1]}` : "0x000000";
}

/** Duración del video en segundos (ffprobe). */
export function probeDuration(input: string): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      input,
    ]);
    let out = "";
    p.stdout.on("data", (d: Buffer) => (out += d.toString()));
    p.on("close", () => resolve(Math.max(0.1, parseFloat(out.trim()) || 0.1)));
    p.on("error", () => resolve(0.1));
  });
}

/**
 * Render desde la config del Estudio:
 *  1) Chromium renderiza el overlay (logo + zócalo + marca) a un PNG transparente
 *     con el mismo HTML/CSS/fuentes que el preview.
 *  2) FFmpeg escala el video a cover y superpone el PNG (overlay full-frame).
 */
/**
 * Filtro FFmpeg que ubica el medio [0:v] en el cuadro W×H según el ajuste
 * (cover/contener) y el margen, dejando el resultado en [base]. Sirve para
 * video y para imagen.
 */
function buildBase(cfg: Record<string, unknown>, W: number, H: number): string {
  const margen = Math.max(0, Math.min(35, Number(cfg.margen ?? 0)));
  const contener = cfg.ajuste === "contener";
  const col = ffColor(String(cfg.margenColor ?? "#000000"));

  if (margen === 0 && !contener) {
    // Cover full-frame (lo de siempre).
    return (
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,` +
      `crop=${W}:${H},setsar=1[base];`
    );
  }
  const mx = even((margen / 100) * W);
  const my = even((margen / 100) * H);
  const iw = even(W - 2 * mx);
  const ih = even(H - 2 * my);
  if (contener) {
    // Entra completo (decrease) y se centra → bandas del color de fondo.
    return (
      `color=c=${col}:s=${W}x${H}[bg];` +
      `[0:v]scale=${iw}:${ih}:force_original_aspect_ratio=decrease,setsar=1[v];` +
      `[bg][v]overlay=(W-w)/2:(H-h)/2:shortest=1[base];`
    );
  }
  // Cover dentro del recuadro con margen (increase + crop al recuadro).
  return (
    `color=c=${col}:s=${W}x${H}[bg];` +
    `[0:v]scale=${iw}:${ih}:force_original_aspect_ratio=increase,` +
    `crop=${iw}:${ih},setsar=1[v];` +
    `[bg][v]overlay=${mx}:${my}:shortest=1[base];`
  );
}

export async function renderFromConfig(
  input: string,
  output: string,
  cfg: Record<string, unknown>,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const [W, H] = DIMS[String(cfg.aspecto ?? "9:16")] ?? DIMS["9:16"]!;
  const dur = await probeDuration(input);
  const dir = await mkdtemp(join(tmpdir(), "render-"));
  try {
    const overlay = join(dir, "overlay.png");
    await renderOverlayHtml(buildOverlayHtml(cfg, W, H), W, H, overlay);

    const base = buildBase(cfg, W, H);

    const args = [
      "-y",
      "-i",
      input,
      "-filter_complex",
      base + `movie='${overlay}'[ov];[base][ov]overlay=0:0[vout]`,
      "-map",
      "[vout]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-shortest",
      "-progress",
      "pipe:1",
      "-nostats",
      output,
    ];
    await runWithProgress(args, dur, onProgress, signal);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Render de IMAGEN: compone la foto (cover/contener + margen) con el overlay
 * (logo/zócalo/marca) y saca un JPG de un frame. Sin audio, mucho más rápido.
 */
export async function renderImageFromConfig(
  input: string,
  output: string,
  cfg: Record<string, unknown>,
): Promise<void> {
  const [W, H] = DIMS[String(cfg.aspecto ?? "9:16")] ?? DIMS["9:16"]!;
  const dir = await mkdtemp(join(tmpdir(), "render-img-"));
  try {
    const overlay = join(dir, "overlay.png");
    await renderOverlayHtml(buildOverlayHtml(cfg, W, H), W, H, overlay);

    const base = buildBase(cfg, W, H);
    const args = [
      "-y",
      "-i",
      input,
      "-filter_complex",
      base + `movie='${overlay}'[ov];[base][ov]overlay=0:0[vout]`,
      "-map",
      "[vout]",
      "-frames:v",
      "1",
      "-q:v",
      "3",
      output,
    ];
    await new Promise<void>((resolve, reject) => {
      const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
      let err = "";
      p.stderr.on("data", (d: Buffer) => (err += d.toString()));
      p.on("error", reject);
      p.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error("ffmpeg img: " + err.slice(-800))),
      );
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Error que indica cancelación (para no marcarlo como error real). */
export class CanceladoError extends Error {
  constructor() {
    super("CANCELADO");
    this.name = "CanceladoError";
  }
}

/** Extrae una miniatura (un frame) del video a JPG. */
export function extractThumbnail(input: string, outJpg: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "ffmpeg",
      ["-y", "-ss", "1", "-i", input, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", outJpg],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    p.stderr.on("data", (d: Buffer) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("thumb: " + err.slice(-200))),
    );
  });
}

function runWithProgress(
  args: string[],
  durSec: number,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new CanceladoError());
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    signal?.addEventListener("abort", () => {
      proc.kill("SIGKILL");
      reject(new CanceladoError());
    });
    let err = "";
    let buf = "";
    proc.stderr.on("data", (d: Buffer) => {
      err += d.toString();
    });
    proc.stdout.on("data", (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const ln of lines) {
        const m = ln.match(/out_time_us=(\d+)/);
        if (m) {
          const pct = Math.min(99, Math.round((Number(m[1]) / 1e6 / durSec) * 100));
          if (pct >= 0) onProgress(pct);
        }
      }
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg salió con código ${code}:\n${err.slice(-1500)}`));
    });
  });
}
