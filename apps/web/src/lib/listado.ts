import { parseHTML } from "linkedom";

export type ListadoItem = { titulo: string; link: string; resumen: string };

function resolverUrl(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/**
 * Extrae links de artículos de una página de LISTADO (sección/tema en HTML, no RSS).
 * Heurística: mismo dominio, no páginas de tema/autor, y el último segmento parece
 * nota (id `-nidNNN` o slug largo con guiones). Devuelve items compatibles con el feed.
 */
export function extraerLinksDeListado(html: string, baseUrl: string): ListadoItem[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const { document } = parseHTML(html);
  const self = `${base.origin}${base.pathname}`.replace(/\/+$/, "");
  const vistos = new Set<string>();
  const items: ListadoItem[] = [];

  for (const a of Array.from(document.querySelectorAll("a[href]"))) {
    const abs = resolverUrl(a.getAttribute("href"), baseUrl);
    if (!abs) continue;
    let u: URL;
    try {
      u = new URL(abs);
    } catch {
      continue;
    }
    if (u.hostname !== base.hostname) continue;

    const clean = `${u.origin}${u.pathname}`.replace(/\/+$/, "");
    if (clean === self || vistos.has(clean)) continue;

    const segs = u.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1] ?? "";
    const primero = segs[0] ?? "";
    if (primero === "tema" || primero === "autor" || primero === "tag") continue;

    const pareceNota =
      /-nid\d{4,}/i.test(last) ||
      (segs.length >= 2 && last.includes("-") && last.length >= 25 && !/-tid\d+/i.test(last));
    if (!pareceNota) continue;

    vistos.add(clean);
    items.push({
      titulo: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      link: clean,
      resumen: "",
    });
  }
  return items;
}
