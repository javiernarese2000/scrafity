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
