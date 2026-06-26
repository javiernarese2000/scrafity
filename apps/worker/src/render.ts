import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type RenderOpts = {
  /** Ruta al video de entrada. */
  inputPath: string;
  /** Ruta donde se escribe el MP4 resultante. */
  outputPath: string;
  /** PNG con transparencia para el logo (esquina superior derecha). */
  logoPath?: string;
  /** Texto del zócalo (lower-third). Se ubica en una barra al pie. */
  zocalo?: string;
  /** Dimensiones de salida. Por defecto 1080x1920 (9:16, Reels/TikTok). */
  width?: number;
  height?: number;
  /** Tipografía para el zócalo. Por defecto DejaVuSans (viene en el Docker). */
  fontFile?: string;
};

const FONT_DEFAULT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

/**
 * Construye el `-filter_complex`: escala el video a 9:16 con padding, superpone
 * el logo (si hay) y dibuja el zócalo (barra translúcida + texto) si hay.
 * Siempre termina en la etiqueta [vout].
 */
export function buildFilterComplex(o: {
  hasLogo: boolean;
  width: number;
  height: number;
  fontFile: string;
  textFile?: string;
}): string {
  const { hasLogo, width: W, height: H, fontFile, textFile } = o;
  const parts: string[] = [];

  parts.push(
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[base]`,
  );

  let last = "base";
  if (hasLogo) {
    parts.push(`[1:v]scale=${Math.round(W * 0.2)}:-1[lg]`);
    parts.push(`[${last}][lg]overlay=W-w-40:40[v1]`);
    last = "v1";
  }

  if (textFile) {
    // El frame ya es exactamente W×H tras el scale+pad, así que usamos
    // posiciones numéricas (drawbox no entiende las variables W/H).
    const barH = Math.round(H * 0.09);
    const barY = H - (barH + 80);
    const fontSize = Math.round(H * 0.03);
    const textY = barY + Math.round(barH * 0.28);
    parts.push(
      `[${last}]drawbox=x=0:y=${barY}:w=${W}:h=${barH}:color=black@0.55:t=fill,` +
        `drawtext=fontfile=${fontFile}:textfile=${textFile}:` +
        `fontcolor=white:fontsize=${fontSize}:x=64:y=${textY}:line_spacing=8[vout]`,
    );
    last = "vout";
  }

  if (last !== "vout") parts.push(`[${last}]null[vout]`);
  return parts.join(";");
}

/** Compone el video: escala a 9:16, agrega logo y zócalo, y escribe el MP4. */
export async function renderVideo(opts: RenderOpts): Promise<void> {
  const W = opts.width ?? 1080;
  const H = opts.height ?? 1920;
  const fontFile = opts.fontFile ?? FONT_DEFAULT;

  const dir = await mkdtemp(join(tmpdir(), "scrapify-render-"));
  try {
    let textFile: string | undefined;
    if (opts.zocalo && opts.zocalo.trim()) {
      textFile = join(dir, "zocalo.txt");
      await writeFile(textFile, opts.zocalo, "utf8");
    }

    const filter = buildFilterComplex({
      hasLogo: Boolean(opts.logoPath),
      width: W,
      height: H,
      fontFile,
      textFile,
    });

    const args: string[] = ["-y", "-i", opts.inputPath];
    if (opts.logoPath) args.push("-i", opts.logoPath);
    args.push(
      "-filter_complex",
      filter,
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
      opts.outputPath,
    );

    await runFfmpeg(args);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d: Buffer) => {
      err += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg salió con código ${code}:\n${err.slice(-1500)}`));
    });
  });
}

// ───────────────────────── Render por config (cola) ─────────────────────────

export type RenderConfig = {
  aspecto?: "9:16" | "1:1" | "16:9";
  logoPath?: string | null;
  logoX?: number; // % centro
  logoY?: number;
  logoSize?: number; // % del ancho
  logoOpacidad?: number; // 0..100
  zocalo?: {
    texto?: string;
    fontFile?: string;
    fontSize?: number;
    colorTexto?: string;
    colorBarra?: string;
    opacidad?: number;
    padding?: number;
  } | null;
};

const DIMS: Record<string, [number, number]> = {
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
};

/** #rrggbb → 0xRRGGBB para FFmpeg. */
function ffColor(hex?: string, fallback = "0x111111"): string {
  if (!hex) return fallback;
  return "0x" + hex.replace("#", "");
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

function buildArgsConfig(
  input: string,
  output: string,
  cfg: RenderConfig,
  textFile?: string,
): string[] {
  const [W, H] = DIMS[cfg.aspecto ?? "9:16"]!;
  const parts: string[] = [];
  parts.push(
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[base]`,
  );
  let last = "base";

  if (cfg.logoPath) {
    const sz = Math.round((W * (cfg.logoSize ?? 24)) / 100);
    const aa = ((cfg.logoOpacidad ?? 100) / 100).toFixed(2);
    parts.push(`[1:v]scale=${sz}:-1,format=rgba,colorchannelmixer=aa=${aa}[lg]`);
    const x = cfg.logoX ?? 86;
    const y = cfg.logoY ?? 12;
    parts.push(
      `[${last}][lg]overlay=x=${W}*${x}/100-w/2:y=${H}*${y}/100-h/2[v1]`,
    );
    last = "v1";
  }

  if (textFile && cfg.zocalo) {
    const z = cfg.zocalo;
    const barH = Math.round(H * 0.09);
    const barY = H - (barH + 80);
    const fs = z.fontSize ?? Math.round(H * 0.03);
    const ty = barY + Math.round(barH * 0.28);
    const op = ((z.opacidad ?? 0.55) as number).toFixed(2);
    const font = z.fontFile ?? "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
    parts.push(
      `[${last}]drawbox=x=0:y=${barY}:w=${W}:h=${barH}:color=${ffColor(z.colorBarra)}@${op}:t=fill,` +
        `drawtext=fontfile=${font}:textfile=${textFile}:fontcolor=${ffColor(z.colorTexto, "0xffffff")}:` +
        `fontsize=${fs}:x=64:y=${ty}[vout]`,
    );
    last = "vout";
  }

  if (last !== "vout") parts.push(`[${last}]null[vout]`);

  const args = ["-y", "-i", input];
  if (cfg.logoPath) args.push("-i", cfg.logoPath);
  args.push(
    "-filter_complex",
    parts.join(";"),
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
  );
  return args;
}

/** Render desde config con callback de progreso (0..100). */
export async function renderFromConfig(
  input: string,
  output: string,
  cfg: RenderConfig,
  onProgress: (pct: number) => void,
): Promise<void> {
  const dur = await probeDuration(input);
  const dir = await mkdtemp(join(tmpdir(), "scrapify-cfg-"));
  try {
    let textFile: string | undefined;
    if (cfg.zocalo?.texto && cfg.zocalo.texto.trim()) {
      textFile = join(dir, "zocalo.txt");
      await writeFile(textFile, cfg.zocalo.texto, "utf8");
    }
    const args = buildArgsConfig(input, output, cfg, textFile);
    await runWithProgress(args, dur, onProgress);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runWithProgress(
  args: string[],
  durSec: number,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
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
