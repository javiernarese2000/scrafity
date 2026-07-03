import { parseHTML } from "linkedom";

export type ListadoItem = { titulo: string; link: string; resumen: string };

// Segmentos de URL que indican una página de LISTADO/navegación (no un artículo).
const NAV_LISTADO = new Set([
  "tema", "temas", "topics", "topic", "autor", "author", "tag", "tags",
  "categoria", "categorias", "seccion", "secciones", "section", "sections",
  "live", "video", "videos", "ws", "search", "buscar", "hub", "podcasts",
  "programas",
]);

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
// Slugs de páginas legales/footer que NO son notas (evita falsos positivos).
const FOOTER = /(privacidad|terminos|condiciones|cookies|suscrib|contacto|nosotros|aviso-legal|publicidad|newsletter|boletin|sitemap)/i;

/** ¿La URL parece un artículo (y no una página de listado/navegación)? */
function esArticulo(pathname: string): boolean {
  const segs = pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  if (segs.some((s) => NAV_LISTADO.has(s))) return false;
  if (segs.includes("articles") || segs.includes("article")) return true; // BBC y similares
  if (/-nid\d{4,}/i.test(last)) return true; // La Nación (/economia/…-nid123)
  // Slug largo genérico (otros diarios); excluye páginas legales/footer poco profundas.
  if (segs.length >= 2 && last.includes("-") && last.length >= 25 && !/-tid\d+/i.test(last)) {
    return !(segs.length <= 2 && FOOTER.test(last));
  }
  return false;
}

export function extraerLinksDeListado(html: string, baseUrl: string): ListadoItem[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const self = `${base.origin}${base.pathname}`.replace(/\/+$/, "");
  const vistos = new Set<string>();
  const items: ListadoItem[] = [];

  const agregar = (href: string | null, titulo: string) => {
    const abs = resolverUrl(href, baseUrl);
    if (!abs) return;
    let u: URL;
    try {
      u = new URL(abs);
    } catch {
      return;
    }
    if (u.hostname !== base.hostname) return;
    const clean = `${u.origin}${u.pathname}`.replace(/\/+$/, "");
    if (clean === self || vistos.has(clean) || !esArticulo(u.pathname)) return;
    vistos.add(clean);
    items.push({ titulo: titulo.replace(/\s+/g, " ").trim(), link: clean, resumen: "" });
  };

  try {
    const { document } = parseHTML(html);
    for (const a of Array.from(document.querySelectorAll("a[href]"))) {
      agregar(a.getAttribute("href"), a.textContent ?? "");
    }
  } catch {
    // linkedom puede fallar con HTML muy anidado/malformado ("Maximum nested
    // tags exceeded"). Respaldo con regex, que ignora el anidamiento.
    const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      agregar(m[1] ?? null, (m[2] ?? "").replace(/<[^>]+>/g, " "));
    }
  }

  return items;
}
