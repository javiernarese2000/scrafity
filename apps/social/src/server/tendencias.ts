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

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    return items.slice(0, 15).map((m, i) => {
      const b = m[1]!;
      const noticiaBlock =
        b.match(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/)?.[1] ?? "";
      const traffic = pick(b, "ht:approx_traffic") ?? "";
      const titulo = pick(noticiaBlock, "ht:news_item_title");
      const url = pick(noticiaBlock, "ht:news_item_url");
      return {
        rank: i + 1,
        termino: pick(b, "title") ?? "—",
        traffic,
        trafficNum: parseTraffic(traffic),
        imagen: pick(b, "ht:picture"),
        noticia:
          titulo && url
            ? { titulo, url, fuente: pick(noticiaBlock, "ht:news_item_source") }
            : null,
      };
    });
  } catch {
    return [];
  }
}
