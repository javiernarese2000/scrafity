"use server";

import crypto from "node:crypto";

import { Readability } from "@mozilla/readability";
import { articles, db } from "@scrapify/db";
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
    // recuperamos del HTML original y las sumamos al final del contenido.
    const listas = recuperarListas(document as unknown as Document, md);
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

export async function generarVersiones(input: {
  url: string;
  fuente: string;
  titulo: string;
  contenido: string;
  imagenUrl: string | null;
  nVersiones: number;
  tono: string;
  proveedor: ProviderName | "auto";
}): Promise<{ articleId: string }> {
  const hash = crypto.createHash("sha256").update(input.contenido).digest("hex");

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
    .returning();

  await generarVersionesCore(art!.id, {
    nVersiones: input.nVersiones,
    tono: input.tono,
    proveedor: input.proveedor,
  });

  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
  return { articleId: art!.id };
}
