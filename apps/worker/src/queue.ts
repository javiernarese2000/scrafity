import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claimNext, setError, setListo, setProgreso } from "./db.js";
import { probeDuration, renderFromConfig, type RenderConfig } from "./render.js";
import { descargar, subir, urlPublica } from "./storage.js";

const DJ = "/usr/share/fonts/truetype/dejavu";
const ZF = "/usr/share/fonts/truetype/zoocial";
// El preview del Estudio mide ~380px de ancho; el render es 1080/1920 → se
// escalan tamaños de texto y padding por width/380.
// Variantes Bold para darle más cuerpo al texto (el preview usa pesos medium/
// semibold; DejaVu regular sale flaco en video).
const FONT_MAP: Record<string, string> = {
  display: `${DJ}/DejaVuSerif-Bold.ttf`,
  sans: `${DJ}/DejaVuSans-Bold.ttf`,
  inter: `${DJ}/DejaVuSans-Bold.ttf`,
  archivo: `${DJ}/DejaVuSans-Bold.ttf`,
  mono: `${DJ}/DejaVuSansMono-Bold.ttf`,
  anton: `${ZF}/Anton-Regular.ttf`,
  bebas: `${ZF}/BebasNeue-Regular.ttf`,
  oswald: `${ZF}/Oswald.ttf`,
};

/** Mapea la config guardada del Estudio a la config del render. */
function mapConfig(cfg: Record<string, unknown>, logoPath?: string): RenderConfig {
  const g = cfg as Record<string, number | string | boolean | undefined>;
  const aspecto = (g.aspecto as RenderConfig["aspecto"]) ?? "9:16";
  const W = aspecto === "16:9" ? 1920 : 1080;
  // Escala preview→render. Un toque menos que antes (el render salía algo
  // grande respecto del preview).
  const scale = W / 360;

  const zocaloOn = g.zocaloOn !== false;
  let texto = g.texto ? String(g.texto) : "";
  if (g.mayus) texto = texto.toUpperCase();

  const fuente = String(g.fuente ?? "display");
  const wmOn = g.wmOn === true;

  return {
    aspecto,
    logoPath: logoPath ?? null,
    logoX: g.logoX as number | undefined,
    logoY: g.logoY as number | undefined,
    logoSize: g.logoSize as number | undefined,
    logoOpacidad: g.logoOpacidad as number | undefined,
    zocalo:
      zocaloOn && texto
        ? {
            texto,
            estilo: g.estilo as NonNullable<RenderConfig["zocalo"]>["estilo"],
            fontFile: FONT_MAP[fuente] ?? FONT_MAP.display,
            fontSize: Math.round(Number(g.fontSize ?? 22) * scale),
            colorTexto: g.colorTexto as string | undefined,
            colorBarra: g.colorBarra as string | undefined,
            opacidad: g.opacidad as number | undefined,
            padding: Math.round(Number(g.padding ?? 16) * scale),
            posicion: g.posicion as NonNullable<RenderConfig["zocalo"]>["posicion"],
            alineacion: g.alineacion as "left" | "center" | "right" | undefined,
            efecto: g.efecto as NonNullable<RenderConfig["zocalo"]>["efecto"],
          }
        : null,
    marca: wmOn
      ? {
          texto: String(g.wmText ?? ""),
          modo: (g.wmModo as "mosaico" | "centro") ?? "mosaico",
          fontSize: Math.round(Number(g.wmTam ?? 20) * scale),
          color: g.wmColor as string | undefined,
          opacidad: Number(g.wmOpacidad ?? 14) / 100,
        }
      : null,
  };
}

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

    const cfg = job.config ?? {};
    let logoPath: string | undefined;
    const logoData = (cfg as Record<string, unknown>).logoDataUrl;
    if (typeof logoData === "string" && logoData.startsWith("data:")) {
      logoPath = join(dir, "logo.png");
      const b64 = logoData.split(",")[1] ?? "";
      await writeFile(logoPath, Buffer.from(b64, "base64"));
    }

    const out = join(dir, "out.mp4");
    let last = -5;
    await renderFromConfig(src, out, mapConfig(cfg, logoPath), (pct) => {
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
