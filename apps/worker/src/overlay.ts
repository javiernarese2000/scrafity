import { chromium, type Browser } from "playwright";

const ACCENT = "#c0883e";
const FONTS_LINK =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Oswald:wght@400;500;600&display=swap";

const FAMILIAS: Record<string, string> = {
  display: "'Fraunces',serif",
  sans: "'Geist',sans-serif",
  mono: "'Geist Mono',monospace",
  anton: "'Anton',sans-serif",
  bebas: "'Bebas Neue',sans-serif",
  oswald: "'Oswald',sans-serif",
  inter: "'Inter',sans-serif",
  archivo: "'Archivo',sans-serif",
};

function rgba(hex: string, a: number): string {
  const h = (hex || "#000000").replace("#", "");
  const f = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

type Cfg = Record<string, unknown>;
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

/**
 * Construye el HTML del overlay (logo + zócalo + marca de agua) replicando el
 * preview. Se renderiza a W×H; los px se escalan por W/previewW.
 */
export function buildOverlayHtml(cfg: Cfg, W: number, H: number): string {
  const s = W / Math.max(120, num(cfg.previewW, 384));
  const px = (v: number) => Math.round(v * s);

  // ---- Logo ----
  let logo = "";
  const logoData = str(cfg.logoDataUrl);
  if (logoData.startsWith("data:")) {
    logo =
      `<img src="${logoData}" style="position:absolute;` +
      `left:${num(cfg.logoX, 86)}%;top:${num(cfg.logoY, 12)}%;` +
      `width:${num(cfg.logoSize, 24)}%;transform:translate(-50%,-50%);` +
      `opacity:${num(cfg.logoOpacidad, 100) / 100}">`;
  }

  // ---- Marca de agua ----
  let marca = "";
  if (cfg.wmOn === true && str(cfg.wmText)) {
    const t = esc(str(cfg.wmText));
    const col = str(cfg.wmColor, "#ffffff");
    const op = num(cfg.wmOpacidad, 14) / 100;
    const fz = px(num(cfg.wmTam, 20));
    const base = `color:${col};opacity:${op};font-family:'Geist',sans-serif;font-weight:600;white-space:nowrap`;
    if (str(cfg.wmModo, "mosaico") === "centro") {
      marca = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="${base};font-size:${Math.round(fz * 1.6)}px;transform:rotate(-24deg)">${t}</span></div>`;
    } else {
      const spans = Array.from({ length: 60 })
        .map(() => `<span style="${base};font-size:${fz}px">${t}</span>`)
        .join("");
      marca = `<div style="position:absolute;inset:0;overflow:hidden"><div style="position:absolute;left:50%;top:50%;width:200%;transform:translate(-50%,-50%) rotate(-24deg);display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:${px(24)}px ${px(32)}px">${spans}</div></div>`;
    }
  }

  // ---- Zócalo ----
  let zocalo = "";
  if (cfg.zocaloOn !== false && str(cfg.texto)) {
    let texto = str(cfg.texto);
    if (cfg.mayus) texto = texto.toUpperCase();
    const html = esc(texto).replace(/\n/g, "<br>");
    const fam = FAMILIAS[str(cfg.fuente, "display")] ?? FAMILIAS.display;
    const fs = px(num(cfg.fontSize, 22));
    const pad = px(num(cfg.padding, 16));
    const colT = str(cfg.colorTexto, "#ffffff");
    const colB = str(cfg.colorBarra, "#111111");
    const op = num(cfg.opacidad, 0.55);
    const estilo = str(cfg.estilo, "barra");
    const al = str(cfg.alineacion, "left");
    const pos = str(cfg.posicion, "abajo");

    const efecto = str(cfg.efecto, "ninguno");
    let efCss = "";
    if (efecto === "sombra")
      efCss = `text-shadow:0 ${px(2)}px ${px(8)}px rgba(0,0,0,.75);`;
    else if (efecto === "contorno")
      efCss = `-webkit-text-stroke:${Math.max(1, px(1.5))}px #000;paint-order:stroke fill;`;
    else if (efecto === "ambos")
      efCss = `-webkit-text-stroke:${Math.max(1, px(1.5))}px #000;paint-order:stroke fill;text-shadow:0 ${px(2)}px ${px(8)}px rgba(0,0,0,.7);`;

    const baseText = `margin:0;font-family:${fam};font-size:${fs}px;color:${colT};line-height:1.18;text-align:${al};font-weight:600;${efCss}`;
    const wrap =
      pos === "arriba"
        ? "top:0;left:0;right:0"
        : pos === "centro"
          ? "top:50%;left:0;right:0;transform:translateY(-50%)"
          : "bottom:0;left:0;right:0";
    const justify = al === "center" ? "center" : al === "right" ? "flex-end" : "flex-start";

    const P = `<p style="${baseText}">${html}</p>`;

    if (estilo === "degradado") {
      const dir = pos === "arriba" ? "to bottom" : "to top";
      zocalo = `<div style="position:absolute;${wrap};height:44%;display:flex;align-items:${pos === "arriba" ? "flex-start" : "flex-end"};padding:${pad}px;background:linear-gradient(${dir},${rgba(colB, Math.max(op, 0.6))},transparent)"><p style="${baseText};width:100%">${html}</p></div>`;
    } else if (estilo === "bloque") {
      zocalo = `<div style="position:absolute;${wrap};display:flex;justify-content:${justify};padding:${pad}px"><span style="${baseText};display:inline-block;background:${rgba(colB, op)};border-radius:${px(12)}px;padding:${Math.round(pad * 0.5)}px ${pad}px">${html}</span></div>`;
    } else if (estilo === "resaltado") {
      zocalo = `<div style="position:absolute;${wrap};padding:${pad}px"><p style="${baseText};line-height:1.6"><span style="background:${rgba(colB, op)};padding:.08em .3em;-webkit-box-decoration-break:clone;box-decoration-break:clone">${html}</span></p></div>`;
    } else if (estilo === "caja") {
      zocalo = `<div style="position:absolute;${wrap};padding:${pad}px"><div style="border-radius:${px(12)}px;border:${Math.max(2, px(2))}px solid ${rgba(colT, 0.9)};background:${rgba(colB, op)};padding:${pad}px">${P}</div></div>`;
    } else if (estilo === "cinta") {
      zocalo = `<div style="position:absolute;${wrap};padding:${pad}px"><div style="background:${rgba(colB, op)};border-left:${px(6)}px solid ${ACCENT};padding:${pad}px">${P}</div></div>`;
    } else if (estilo === "minimal") {
      const ml = al === "center" ? "auto" : "0";
      const mr = al === "right" ? "0" : al === "center" ? "auto" : "auto";
      zocalo = `<div style="position:absolute;${wrap};padding:${pad}px"><span style="display:block;height:${px(3)}px;width:${px(32)}px;border-radius:9999px;background:${ACCENT};margin-bottom:${px(6)}px;margin-left:${ml};margin-right:${mr}"></span><p style="${baseText};text-shadow:0 ${px(1)}px ${px(6)}px rgba(0,0,0,.6)">${html}</p></div>`;
    } else {
      // barra
      zocalo = `<div style="position:absolute;${wrap};background:${rgba(colB, op)};padding:${pad}px">${P}</div>`;
    }
  }

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS_LINK}">
<style>html,body{margin:0;padding:0;width:${W}px;height:${H}px;position:relative;background:transparent;overflow:hidden}</style>
</head><body>${marca}${logo}${zocalo}</body></html>`;
}

let browserP: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserP) {
    browserP = chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserP;
}

/** Renderiza un HTML a un PNG transparente de WxH (mismo motor que el preview). */
export async function renderOverlayHtml(
  html: string,
  W: number,
  H: number,
  outPath: string,
): Promise<void> {
  const b = await getBrowser();
  const page = await b.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    // Esperar a que las fuentes web terminen de cargar.
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: outPath, omitBackground: true });
  } finally {
    await page.close();
  }
}
