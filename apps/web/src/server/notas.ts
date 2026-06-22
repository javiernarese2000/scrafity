"use server";

import crypto from "node:crypto";

import { Readability } from "@mozilla/readability";
import { articles, db, rewriteJobs, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { parseHTML } from "linkedom";
import { revalidatePath } from "next/cache";

import { generate, type ProviderName } from "@/ai";
import { buildRewritePrompt, parseRewrite } from "@/ai/prompt";
import { computeSimilarity } from "@/lib/diff";

export type ExtractResult =
  | { ok: true; titulo: string; contenido: string; fuente: string }
  | { ok: false; error: string };

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
    if (!res.ok) {
      return { ok: false, error: `El sitio respondió ${res.status}.` };
    }
    const html = await res.text();
    const { document } = parseHTML(html);
    const article = new Readability(
      document as unknown as Document,
    ).parse();
    const contenido = article?.textContent?.replace(/\n{3,}/g, "\n\n").trim();

    if (!contenido || contenido.length < 200) {
      return {
        ok: false,
        error:
          "No se pudo extraer contenido legible (el sitio puede requerir JS o bloquear bots).",
      };
    }

    return {
      ok: true,
      titulo: article?.title?.trim() ?? "(sin título)",
      contenido,
      fuente: parsed.hostname.replace(/^www\./, ""),
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

  const results = await Promise.all(
    Array.from({ length: input.nVersiones }, () =>
      generate({ system, prompt, temperature: 0.9, maxTokens: 2048 }, input.proveedor),
    ),
  );

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
  return { articleId: art!.id };
}
