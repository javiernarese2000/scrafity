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
    estilo?: "barra" | "degradado" | "bloque" | "resaltado" | "caja" | "cinta" | "minimal";
    fontFile?: string;
    fontSize?: number; // px del render
    colorTexto?: string;
    colorBarra?: string;
    opacidad?: number; // 0..1
    padding?: number; // px del render
    posicion?: "abajo" | "centro" | "arriba";
    alineacion?: "left" | "center" | "right";
    efecto?: "ninguno" | "sombra" | "contorno" | "ambos";
  } | null;
  marca?: {
    texto?: string;
    modo?: "mosaico" | "centro";
    fontSize?: number; // px del render
    color?: string;
    opacidad?: number; // 0..1
    fontFile?: string;
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

const DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const ACCENT = "0xc0883e"; // --color-accent

function efectoDraw(efecto?: string): string {
  switch (efecto) {
    case "sombra":
      return ":shadowx=2:shadowy=2:shadowcolor=0x000000@0.7";
    case "contorno":
      return ":borderw=3:bordercolor=0x000000";
    case "ambos":
      return ":borderw=3:bordercolor=0x000000:shadowx=2:shadowy=3:shadowcolor=0x000000@0.7";
    default:
      return "";
  }
}

/** Word-wrap por cantidad de caracteres (drawtext no envuelve solo). */
function wrapText(text: string, maxChars: number): string {
  const out: string[] = [];
  for (const parrafo of text.split("\n")) {
    const words = parrafo.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= maxChars) cur += " " + w;
      else {
        out.push(cur);
        cur = w;
      }
    }
    out.push(cur);
  }
  return out.join("\n");
}

function xExpr(al: string | undefined, pad: number): string {
  if (al === "center") return "(w-text_w)/2";
  if (al === "right") return `w-text_w-${pad}`;
  return `${pad}`;
}

function yExpr(pos: string | undefined, pad: number): string {
  if (pos === "arriba") return `${pad + 40}`;
  if (pos === "centro") return "(h-text_h)/2";
  return `h-text_h-${pad + 80}`;
}

/** Cadena de filtros para el zócalo según su estilo. */
function buildZocalo(
  last: string,
  W: number,
  H: number,
  z: NonNullable<RenderConfig["zocalo"]>,
  textFile: string,
  zLines: number,
): { chain: string; out: string } {
  const fs = Math.round(z.fontSize ?? Math.round(H * 0.03));
  const pad = Math.round(z.padding ?? 16);
  const font = z.fontFile ?? DEJAVU;
  const colT = ffColor(z.colorTexto, "0xffffff");
  const colB = ffColor(z.colorBarra, "0x111111");
  const op = (z.opacidad ?? 0.55).toFixed(2);
  const ef = efectoDraw(z.efecto);
  const estilo = z.estilo ?? "barra";

  const base = (extra: string, xPad: number, y: string) =>
    `drawtext=fontfile=${font}:textfile=${textFile}:fontcolor=${colT}:` +
    `fontsize=${fs}:line_spacing=8:x=${xExpr(z.alineacion, xPad)}:y=${y}${ef}${extra}`;

  // Estilos con caja pegada al texto
  if (estilo === "bloque" || estilo === "resaltado" || estilo === "caja") {
    const bw = estilo === "resaltado" ? Math.round(pad * 0.4) : pad;
    let extra = `:box=1:boxcolor=${colB}@${op}:boxborderw=${bw}`;
    if (estilo === "caja") extra = `:box=1:boxcolor=${colB}@${op}:boxborderw=${bw}`;
    return {
      chain: `[${last}]${base(extra, pad + 20, yExpr(z.posicion, pad))}[zk]`,
      out: "zk",
    };
  }

  if (estilo === "minimal") {
    return {
      chain: `[${last}]${base("", pad + 20, yExpr(z.posicion, pad))}[zk]`,
      out: "zk",
    };
  }

  // barra / degradado / cinta: banda de ancho completo, alto según las líneas
  const lineH = fs + 8;
  const barH = Math.max(
    estilo === "degradado" ? Math.round(H * 0.2) : 0,
    zLines * lineH + Math.round(pad * 1.6),
  );
  const barY =
    z.posicion === "arriba"
      ? pad
      : z.posicion === "centro"
        ? Math.round((H - barH) / 2)
        : H - barH - pad - 40;
  const ty = `${barY}+(${barH}-text_h)/2`;
  let chain = `[${last}]drawbox=x=0:y=${barY}:w=${W}:h=${barH}:color=${colB}@${op}:t=fill`;
  if (estilo === "cinta")
    chain += `,drawbox=x=0:y=${barY}:w=8:h=${barH}:color=${ACCENT}:t=fill`;
  chain += `,${base("", pad + 28, ty)}[zk]`;
  return { chain, out: "zk" };
}

/** Marca de agua: centrada o mosaico (grilla intercalada). */
function buildMarca(
  last: string,
  m: NonNullable<RenderConfig["marca"]>,
  textFile: string,
): { chain: string; out: string } {
  const fs = Math.round(m.fontSize ?? 56);
  const col = ffColor(m.color, "0xffffff");
  const op = (m.opacidad ?? 0.14).toFixed(2);
  const font = m.fontFile ?? DEJAVU;
  const dt = `drawtext=fontfile=${font}:textfile=${textFile}:fontcolor=${col}@${op}:fontsize=${fs}`;

  if (m.modo === "centro") {
    return { chain: `[${last}]${dt}:x=(w-text_w)/2:y=(h-text_h)/2[mk]`, out: "mk" };
  }
  const cols = [0.18, 0.5, 0.82];
  const rows = [0.12, 0.32, 0.52, 0.72, 0.92];
  const draws: string[] = [];
  rows.forEach((ry, i) => {
    cols.forEach((cx) => {
      const off = i % 2 ? 0.1 : 0;
      draws.push(`${dt}:x=w*${(cx + off).toFixed(2)}-text_w/2:y=h*${ry}-text_h/2`);
    });
  });
  return { chain: `[${last}]${draws.join(",")}[mk]`, out: "mk" };
}

function buildArgsConfig(
  input: string,
  output: string,
  cfg: RenderConfig,
  zTextFile?: string,
  mTextFile?: string,
  zLines = 1,
): string[] {
  const [W, H] = DIMS[cfg.aspecto ?? "9:16"]!;
  const parts: string[] = [];
  // Cover: llena el cuadro y recorta (igual que object-cover del preview).
  parts.push(
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,` +
      `crop=${W}:${H},setsar=1[base]`,
  );
  let last = "base";

  // Marca de agua (detrás de todo)
  if (mTextFile && cfg.marca?.texto) {
    const r = buildMarca(last, cfg.marca, mTextFile);
    parts.push(r.chain);
    last = r.out;
  }

  // Logo
  if (cfg.logoPath) {
    const sz = Math.round((W * (cfg.logoSize ?? 24)) / 100);
    const aa = ((cfg.logoOpacidad ?? 100) / 100).toFixed(2);
    parts.push(`[1:v]scale=${sz}:-1,format=rgba,colorchannelmixer=aa=${aa}[lg]`);
    const x = cfg.logoX ?? 86;
    const y = cfg.logoY ?? 12;
    parts.push(`[${last}][lg]overlay=x=${W}*${x}/100-w/2:y=${H}*${y}/100-h/2[v1]`);
    last = "v1";
  }

  // Zócalo
  if (zTextFile && cfg.zocalo?.texto) {
    const r = buildZocalo(last, W, H, cfg.zocalo, zTextFile, zLines);
    parts.push(r.chain);
    last = r.out;
  }

  const args = ["-y", "-i", input];
  if (cfg.logoPath) args.push("-i", cfg.logoPath);
  args.push(
    "-filter_complex",
    parts.join(";"),
    "-map",
    `[${last}]`,
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
  const [W, H] = DIMS[cfg.aspecto ?? "9:16"]!;
  const dir = await mkdtemp(join(tmpdir(), "scrapify-cfg-"));
  try {
    let zTextFile: string | undefined;
    let zLines = 1;
    if (cfg.zocalo?.texto && cfg.zocalo.texto.trim()) {
      const z = cfg.zocalo;
      const fs = Math.round(z.fontSize ?? Math.round(H * 0.03));
      const pad = Math.round(z.padding ?? 16);
      const font = z.fontFile ?? DEJAVU;
      // Las fuentes condensadas (Anton/Bebas/Oswald) entran más caracteres.
      const factor = /Anton|Bebas|Oswald/.test(font) ? 0.42 : 0.52;
      const usable = W - 2 * (pad + 28) - 16;
      const maxChars = Math.max(8, Math.floor(usable / (fs * factor)));
      const wrapped = wrapText(cfg.zocalo.texto.trim(), maxChars);
      zLines = wrapped.split("\n").length;
      zTextFile = join(dir, "zocalo.txt");
      await writeFile(zTextFile, wrapped, "utf8");
    }
    let mTextFile: string | undefined;
    if (cfg.marca?.texto && cfg.marca.texto.trim()) {
      mTextFile = join(dir, "marca.txt");
      await writeFile(mTextFile, cfg.marca.texto, "utf8");
    }
    const args = buildArgsConfig(input, output, cfg, zTextFile, mTextFile, zLines);
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
