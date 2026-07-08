"use server";

import crypto from "node:crypto";

import { Readability } from "@mozilla/readability";
import { articles, db } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { parseHTML } from "linkedom";
import { revalidatePath } from "next/cache";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

import type { ProviderName } from "@/ai";
import { recuperarListas } from "@/lib/listado";
import { generarVersionesCore } from "./generar";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
turndown.use(gfm);

export type ExtractResult =
  | {
      ok: true;
      titulo: string;
      contenido: string;
      fuente: string;
      imagenUrl: string | null;
    }
  | { ok: false; error: string };

function resolverUrl(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

export async function extraerNota(url: string): Promise<ExtractResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "La URL no es válida." };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ScrapifyBot/0.1; +https://scrapify.app)",
        accept: "text/html",
      },
    });
    if (!res.ok) return { ok: false, error: `El sitio respondió ${res.status}.` };

    const html = await res.text();
    const { document } = parseHTML(html);

    const ogImage =
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") ??
      document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content") ??
      null;

    const article = new Readability(document as unknown as Document).parse();
    if (!article?.content) {
      return {
        ok: false,
        error:
          "No se pudo extraer contenido (el sitio puede requerir JS o bloquear bots).",
      };
    }

    const md = turndown
      .turndown(article.content)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (md.length < 120) {
      return { ok: false, error: "El contenido extraído es demasiado corto." };
    }

    // Readability descarta algunas listas de datos (ej. calendarios en <ul>). Las
    // recuperamos del HTML original. OJO: Readability MUTA el document que recibe
    // (borra nodos), así que re-parseamos el HTML para tenerlo intacto.
    const listas = recuperarListas(parseHTML(html).document as unknown as Document, md);
    const contenido = listas ? `${md}\n\n${listas}` : md;

    const firstImg = article.content.match(
      /<img[^>]+src=["']([^"']+)["']/i,
    )?.[1];
    const imagenUrl =
      resolverUrl(ogImage, url) ?? resolverUrl(firstImg ?? null, url);

    return {
      ok: true,
      titulo: article.title?.trim() ?? "(sin título)",
      contenido,
      fuente: parsed.hostname.replace(/^www\./, ""),
      imagenUrl,
    };
  } catch {
    return { ok: false, error: "No se pudo acceder a la URL." };
  }
}

export type GenerarVersionesResult =
  | { ok: true; articleId: string }
  | { ok: false; error: string };

/**
 * Next.js borra el mensaje real de cualquier error que se LANCE (throw) desde
 * una Server Action en producción (por seguridad, reemplaza por un "digest"
 * genérico). Por eso acá se atrapa el error y se devuelve como DATO, no como
 * excepción — así el mensaje real (qué proveedor de IA falló y por qué) sí
 * llega al usuario.
 */
export async function generarVersiones(input: {
  url: string;
  fuente: string;
  titulo: string;
  contenido: string;
  imagenUrl: string | null;
  nVersiones: number;
  tono: string;
  proveedor: ProviderName | "auto";
}): Promise<GenerarVersionesResult> {
  const hash = crypto.createHash("sha256").update(input.contenido).digest("hex");

  // Dedup por contenido: si esta URL/nota ya se ingestó antes (ej. por "Traer
  // noticias"), no reintentar el insert — buscarla y avisar con un mensaje claro
  // en vez de que el conflicto de la base explote como error crudo (con todo el
  // contenido adentro, lo que además inundó los logs de Railway).
  const [existente] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.hashContenido, hash))
    .limit(1);
  if (existente) {
    return {
      ok: false,
      error: "Esta nota ya está cargada (probablemente por Traer noticias). Buscala en Noticias o Biblioteca.",
    };
  }

  try {
    const [art] = await db
      .insert(articles)
      .values({
        urlOriginal: input.url,
        titulo: input.titulo,
        contenido: input.contenido,
        hashContenido: hash,
        snapshotOriginal: input.contenido,
        imagenUrl: input.imagenUrl,
      })
      .onConflictDoNothing()
      .returning();
    if (!art) {
      return { ok: false, error: "Esta nota ya está cargada (contenido duplicado)." };
    }

    await generarVersionesCore(art.id, {
      nVersiones: input.nVersiones,
      tono: input.tono,
      proveedor: input.proveedor,
    });

    revalidatePath("/moderacion");
    revalidatePath("/biblioteca");
    return { ok: true, articleId: art.id };
  } catch (e) {
    // Log conciso: NUNCA el error crudo completo (trae el contenido de la nota
    // adentro y puede inundar los logs, como pasó con la nota de ANSES).
    console.error("[generarVersiones]", e instanceof Error ? e.message : e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falló la generación.",
    };
  }
}
