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
export async function renderFromConfig(
  input: string,
  output: string,
  cfg: Record<string, unknown>,
  onProgress: (pct: number) => void,
): Promise<void> {
  const [W, H] = DIMS[String(cfg.aspecto ?? "9:16")] ?? DIMS["9:16"]!;
  const dur = await probeDuration(input);
  const dir = await mkdtemp(join(tmpdir(), "render-"));
  try {
    const overlay = join(dir, "overlay.png");
    await renderOverlayHtml(buildOverlayHtml(cfg, W, H), W, H, overlay);

    const args = [
      "-y",
      "-i",
      input,
      "-filter_complex",
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,` +
        `crop=${W}:${H},setsar=1[base];` +
        `movie='${overlay}'[ov];[base][ov]overlay=0:0[vout]`,
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
