"use server";

import crypto from "node:crypto";

import { Readability } from "@mozilla/readability";
import { articles, db, rewriteJobs, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { parseHTML } from "linkedom";
import { revalidatePath } from "next/cache";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

import { generate, type ProviderName } from "@/ai";
import { buildRewritePrompt, parseRewrite } from "@/ai/prompt";
import { computeSimilarity } from "@/lib/diff";

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

    const firstImg = article.content.match(
      /<img[^>]+src=["']([^"']+)["']/i,
    )?.[1];
    const imagenUrl =
      resolverUrl(ogImage, url) ?? resolverUrl(firstImg ?? null, url);

    return {
      ok: true,
      titulo: article.title?.trim() ?? "(sin título)",
      contenido: md,
      fuente: parsed.hostname.replace(/^www\./, ""),
      imagenUrl,
    };
  } catch {
    return { ok: false, error: "No se pudo acceder a la URL." };
  }
}

async function clasificarTags(
  titulo: string,
  contenido: string,
  proveedor: ProviderName | "auto",
): Promise<string[]> {
  try {
    const r = await generate(
      {
        system:
          "Clasificá la noticia. Devolvé SOLO 2 a 4 etiquetas separadas por comas, " +
          "en español y en minúsculas, sin numerar ni explicar. La primera debe ser la " +
          "categoría general (economía, política, deportes, sociedad, tecnología, " +
          "espectáculos, internacional, etc.). Si el contenido es atemporal/evergreen, " +
          "agregá la etiqueta 'evergreen'.",
        prompt: `Título: ${titulo}\n\n${contenido.slice(0, 1200)}`,
        temperature: 0.2,
        maxTokens: 60,
      },
      proveedor,
    );
    return r.text
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 4);
  } catch {
    return [];
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

  const [job] = await db
    .insert(rewriteJobs)
    .values({
      articleId: art!.id,
      nVersiones: input.nVersiones,
      tono: input.tono,
      proveedor: input.proveedor,
      estado: "generando",
    })
    .returning();

  const { system, prompt } = buildRewritePrompt(
    input.titulo,
    input.contenido,
    input.tono,
  );

  const [results, tags] = await Promise.all([
    Promise.all(
      Array.from({ length: input.nVersiones }, () =>
        generate(
          { system, prompt, temperature: 0.9, maxTokens: 3000 },
          input.proveedor,
        ),
      ),
    ),
    clasificarTags(input.titulo, input.contenido, input.proveedor),
  ]);

  if (tags.length) {
    await db.update(articles).set({ tags }).where(eq(articles.id, art!.id));
  }

  for (const r of results) {
    const { titulo, contenido } = parseRewrite(r.text, input.titulo);
    await db.insert(versions).values({
      articleId: art!.id,
      rewriteJobId: job!.id,
      titulo,
      contenido,
      similarityScore: computeSimilarity(input.contenido, contenido),
      proveedor: r.provider,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      estado: "en_revision",
    });
  }

  await db
    .update(rewriteJobs)
    .set({ estado: "completado", updatedAt: new Date() })
    .where(eq(rewriteJobs.id, job!.id));

  revalidatePath("/moderacion");
  revalidatePath("/biblioteca");
  return { articleId: art!.id };
}
