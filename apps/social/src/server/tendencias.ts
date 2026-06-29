"use server";

import { REGIONES, type Tendencia } from "@/lib/tendencias";

const ENT: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};
function decode(s: string): string {
  return s
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (m) => ENT[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]!) : null;
}

/** Heurística simple: ¿el texto parece español? (para no mostrar noticias en inglés). */
function pareceEspanol(t: string): boolean {
  const s = " " + t.toLowerCase() + " ";
  const es =
    (s.match(/\b(de|la|el|en|por|que|con|del|los|las|un|una|para|como|qué|dónde|vivo|partido|según|más|sobre)\b/g)?.length ?? 0) +
    (/[áéíóúñ¿¡]/.test(s) ? 2 : 0);
  const en =
    s.match(/\b(the|of|in|for|with|and|to|on|at|his|her|world|cup|star|fans|shock|boss|decision|live|vs|was|it|that|who|what)\b/g)?.length ?? 0;
  // Necesita al menos una marca de español y no estar dominado por inglés.
  return es > 0 && es >= en;
}

/** "500+", "1K+", "2M+" → número aproximado. */
function parseTraffic(s: string | null): number {
  if (!s) return 0;
  const m = s.match(/([\d.]+)\s*([KM]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]!);
  const mult =
    m[2]?.toUpperCase() === "M" ? 1_000_000 : m[2]?.toUpperCase() === "K" ? 1000 : 1;
  return Math.round(n * mult);
}

/** Tendencias en vivo de Google Trends (búsquedas del día) por región. */
export async function getTendencias(geo = "AR"): Promise<Tendencia[]> {
  const region = REGIONES.find((r) => r.id === geo)?.id ?? "AR";
  try {
    const res = await fetch(
      `https://trends.google.com/trending/rss?geo=${region}`,
      { headers: { "user-agent": "Mozilla/5.0" }, cache: "no-store" },
    );
    if (!res.ok) return [];
    const xml = await res.text();

    // En regiones hispanohablantes preferimos noticias en español; en US, no.
    const preferEs = region !== "US";

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    return items.slice(0, 15).map((m, i) => {
      const b = m[1]!;
      const traffic = pick(b, "ht:approx_traffic") ?? "";

      // Cada tendencia trae varias noticias: elegimos la 1ª válida (en español si corresponde).
      let noticia: Tendencia["noticia"] = null;
      for (const n of b.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)) {
        const nb = n[1]!;
        const titulo = pick(nb, "ht:news_item_title");
        const url = pick(nb, "ht:news_item_url");
        if (!titulo || !url) continue;
        if (preferEs && !pareceEspanol(titulo)) continue;
        noticia = { titulo, url, fuente: pick(nb, "ht:news_item_source") };
        break;
      }

      return {
        rank: i + 1,
        termino: pick(b, "title") ?? "—",
        traffic,
        trafficNum: parseTraffic(traffic),
        imagen: pick(b, "ht:picture"),
        noticia,
      };
    });
  } catch {
    return [];
  }
}
