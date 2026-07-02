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
 * Recupera listas de datos (`<ul>`/`<ol>`) que Readability descarta al "limpiar"
 * el artículo — ej. los calendarios de fechas de ANSES. Ubica el cuerpo de la nota
 * a partir de una frase del contenido ya extraído y saca de ahí las listas de texto
 * (no navegación) que falten. Se devuelven en markdown para sumar al final.
 */
export function recuperarListas(doc: Document, mdActual: string): string {
  const frase = mdActual.replace(/[*_`~#]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (frase.length < 15) return "";

  // Ancla: el <p> que contiene el arranque del artículo (no un contenedor grande).
  let ancla: Element | null = null;
  for (const p of Array.from(doc.querySelectorAll("p"))) {
    if ((p.textContent ?? "").includes(frase)) {
      ancla = p;
      break;
    }
  }
  if (!ancla) return "";

  // Subir hasta el primer contenedor que incluya una lista real (o un límite
  // semántico), para no salir del cuerpo de la nota y evitar duplicados.
  let cuerpo: Element = ancla;
  for (let i = 0; i < 10 && cuerpo.parentElement; i++) {
    cuerpo = cuerpo.parentElement;
    const tag = cuerpo.tagName?.toLowerCase();
    const tieneLista = Array.from(cuerpo.querySelectorAll("ul, ol")).some(
      (l) => l.querySelectorAll("li").length >= 3,
    );
    if (tieneLista || tag === "article" || tag === "section" || tag === "main") break;
  }

  const bloques: string[] = [];
  const vistos = new Set<string>();
  for (const list of Array.from(cuerpo.querySelectorAll("ul, ol"))) {
    const items = Array.from(list.querySelectorAll("li"))
      .map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (items.length < 3) continue;
    if (list.querySelectorAll("a").length > items.length / 2) continue; // navegación
    if (items[0] && mdActual.includes(items[0].slice(0, 25))) continue; // ya está
    const key = items[0]!.slice(0, 30);
    if (vistos.has(key)) continue;
    vistos.add(key);
    bloques.push(items.map((t) => `- ${t}`).join("\n"));
  }
  return bloques.join("\n\n");
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
