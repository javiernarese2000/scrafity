import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

import { canonizarCategoria, claveCategoria } from "@/lib/categorias";
import { decrypt } from "@/lib/crypto";

// Si el WordPress del cliente responde lento o se cuelga, el fetch no debe
// quedar esperando para siempre (eso venía reteniendo memoria en el despachador
// automático hasta agotar el proceso). Mismo criterio que el statement_timeout
// de la base de datos.
const TIMEOUT_MS = 20_000;
function conTimeout(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS);
}

export type WpCredenciales = {
  username: string;
  appPassword: string;
};

/** Credenciales tal como se guardan cifradas en `destinations.credencialesCifradas`. */
export function parseCredenciales(cifradas: string | null): WpCredenciales {
  if (!cifradas) throw new Error("El destino no tiene credenciales configuradas.");
  return JSON.parse(decrypt(cifradas)) as WpCredenciales;
}

/** Normaliza la base a la raíz de la REST API: `https://sitio.com/wp-json`. */
function apiBase(url: string): string {
  const limpia = url.replace(/\/+$/, "");
  return limpia.endsWith("/wp-json") ? limpia : `${limpia}/wp-json`;
}

function authHeader(c: WpCredenciales): string {
  const token = Buffer.from(`${c.username}:${c.appPassword}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Verifica las credenciales contra `/wp/v2/users/me`. Devuelve el nombre del
 * usuario autenticado si todo OK; tira error con mensaje claro si no.
 */
export async function probarConexionWp(
  url: string,
  cred: WpCredenciales,
): Promise<{ ok: true; usuario: string }> {
  const res = await fetch(`${apiBase(url)}/wp/v2/users/me?context=edit`, {
    headers: { Authorization: authHeader(cred) },
    signal: conTimeout(),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(
      `WordPress respondió ${res.status}. Revisá URL, usuario y contraseña de aplicación. ${detalle.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    name?: string;
    slug?: string;
    capabilities?: Record<string, boolean>;
  };
  const usuario = data.name ?? data.slug ?? "usuario";
  // Con context=edit, WP incluye las capabilities del usuario.
  if (data.capabilities && data.capabilities.publish_posts !== true) {
    throw new Error(
      `Conectado como ${usuario}, pero ese usuario NO puede publicar entradas (rol insuficiente). Usá un Administrador o Editor.`,
    );
  }
  return { ok: true, usuario };
}

export type WpCategoria = { id: number; name: string };

/** Lista las categorías existentes del sitio (para elegir al publicar). */
export async function listarCategoriasWp(
  url: string,
  cred: WpCredenciales,
): Promise<WpCategoria[]> {
  const res = await fetch(
    `${apiBase(url)}/wp/v2/categories?per_page=100&orderby=name&order=asc&_fields=id,name`,
    { headers: { Authorization: authHeader(cred) }, signal: conTimeout() },
  );
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`No se pudieron leer las categorías (${res.status}). ${detalle.slice(0, 150)}`);
  }
  return (await res.json()) as WpCategoria[];
}

/**
 * Resuelve un nombre de categoría a su ID de WP. Canoniza el nombre a UN término
 * de la taxonomía y matchea contra las existentes colapsando variantes conocidas
 * (Internacional/Internacionales, Política/Politicas) para REUSAR la categoría en
 * vez de crear duplicados. Solo crea si no hay ninguna equivalente.
 */
async function resolverCategoriaWp(
  base: string,
  cred: WpCredenciales,
  nombre: string,
): Promise<number | null> {
  try {
    const q = await fetch(
      `${base}/wp/v2/categories?per_page=100&_fields=id,name`,
      { headers: { Authorization: authHeader(cred) }, signal: conTimeout() },
    );
    const existentes = q.ok ? ((await q.json()) as WpCategoria[]) : [];
    const canonico = canonizarCategoria(nombre);
    const target = claveCategoria(canonico);
    const match = existentes.find((c) => claveCategoria(c.name) === target);
    if (match) return match.id;
    const crear = await fetch(`${base}/wp/v2/categories`, {
      method: "POST",
      headers: {
        Authorization: authHeader(cred),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: canonico }),
      signal: conTimeout(),
    });
    if (crear.ok) {
      const data = (await crear.json()) as { id?: number };
      return data.id ?? null;
    }
  } catch {
    // Si falla, publica sin categoría.
  }
  return null;
}

/** Resuelve nombres de tags a IDs de WP (busca y, si no existe, crea). */
async function resolverTagsWp(
  base: string,
  cred: WpCredenciales,
  nombres: string[],
): Promise<number[]> {
  const ids: number[] = [];
  for (const nombre of nombres) {
    try {
      const q = await fetch(
        `${base}/wp/v2/tags?search=${encodeURIComponent(nombre)}&_fields=id,name`,
        { headers: { Authorization: authHeader(cred) }, signal: conTimeout() },
      );
      const existentes = q.ok ? ((await q.json()) as WpCategoria[]) : [];
      const match = existentes.find(
        (t) => t.name.toLowerCase() === nombre.toLowerCase(),
      );
      if (match) {
        ids.push(match.id);
        continue;
      }
      const crear = await fetch(`${base}/wp/v2/tags`, {
        method: "POST",
        headers: {
          Authorization: authHeader(cred),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: nombre }),
        signal: conTimeout(),
      });
      if (crear.ok) {
        const data = (await crear.json()) as { id?: number };
        if (data.id) ids.push(data.id);
      }
    } catch {
      // Un tag que falla no debe impedir publicar.
    }
  }
  return ids;
}

/** Sube una imagen por URL a la biblioteca de medios y devuelve su id. */
async function subirMedia(
  base: string,
  cred: WpCredenciales,
  imagenUrl: string,
): Promise<number | null> {
  try {
    const img = await fetch(imagenUrl, { signal: conTimeout() });
    if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    const tipo = img.headers.get("content-type") ?? "image/jpeg";
    const nombre = imagenUrl.split("/").pop()?.split("?")[0] || "portada.jpg";

    const res = await fetch(`${base}/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: authHeader(cred),
        "Content-Type": tipo,
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
      body: buf,
      signal: conTimeout(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: number };
    return data.id ?? null;
  } catch {
    // Una imagen que falla no debe impedir publicar el post.
    return null;
  }
}

/** Primer bloque de texto real del Markdown (saltea títulos e imágenes). */
function primerParrafo(markdown: string): string {
  for (const bloque of markdown.split(/\n\s*\n/)) {
    const t = bloque.trim();
    if (!t || t.startsWith("#") || t.startsWith("![")) continue;
    return t;
  }
  return markdown.trim();
}

/** Convierte un párrafo Markdown a texto plano para usar como extracto. */
function aTextoPlano(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extracto a partir del primer párrafo, recortado a `max` caracteres. */
function construirExtracto(markdown: string, max = 300): string {
  const texto = aTextoPlano(primerParrafo(markdown));
  if (texto.length <= max) return texto;
  return texto.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Limpia el HTML antes de publicarlo en WordPress (anti stored-XSS). */
function sanitizar(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "figure",
      "figcaption",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height"],
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/** Inserta el quicktag <!--more--> tras el primer párrafo del HTML. */
function insertarMore(html: string): string {
  const idx = html.indexOf("</p>");
  if (idx === -1) return html;
  return `${html.slice(0, idx + 4)}\n<!--more-->\n${html.slice(idx + 4)}`;
}

export type PublicarWpInput = {
  url: string;
  cred: WpCredenciales;
  titulo: string;
  contenidoMarkdown: string;
  imagenUrl?: string | null;
  categoriaNombre?: string | null;
  tags?: string[];
};

/**
 * Publica un post en WordPress vía REST API (estado "publish").
 * Convierte el cuerpo Markdown → HTML y, si hay portada, la sube y la asigna
 * como imagen destacada (si la subida falla, publica igual).
 */
export async function publicarEnWordpress(
  input: PublicarWpInput,
): Promise<{ urlPublicada: string; externalId: string }> {
  const base = apiBase(input.url);
  // Sanitizar ANTES de insertar el <!--more--> (sanitize-html quita comentarios).
  const contentHtml = insertarMore(
    sanitizar(await marked.parse(input.contenidoMarkdown)),
  );
  const excerpt = construirExtracto(input.contenidoMarkdown);

  let featured: number | null = null;
  if (input.imagenUrl) {
    featured = await subirMedia(base, input.cred, input.imagenUrl);
  }

  const tagIds =
    input.tags && input.tags.length
      ? await resolverTagsWp(base, input.cred, input.tags)
      : [];

  const categoriaId = input.categoriaNombre
    ? await resolverCategoriaWp(base, input.cred, input.categoriaNombre)
    : null;

  const res = await fetch(`${base}/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: authHeader(input.cred),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.titulo,
      content: contentHtml,
      excerpt,
      status: "publish",
      ...(featured ? { featured_media: featured } : {}),
      ...(categoriaId ? { categories: [categoriaId] } : {}),
      ...(tagIds.length ? { tags: tagIds } : {}),
    }),
    signal: conTimeout(),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(
      `WordPress rechazó la publicación (${res.status}): ${detalle.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { id?: number; link?: string };
  return {
    urlPublicada: data.link ?? "",
    externalId: data.id != null ? String(data.id) : "",
  };
}
