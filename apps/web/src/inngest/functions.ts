import { articles, db, rewriteJobs, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";

import { generate } from "@/ai";
import { inngest, type RewriteRequested } from "./client";

function buildPrompt(titulo: string | null, contenido: string, tono?: string) {
  const system =
    "Sos un periodista que reescribe noticias en español rioplatense. " +
    "Reescribí la nota con tus propias palabras, sin copiar frases del original, " +
    "manteniendo los hechos y datos. Devolvé solo el texto reescrito." +
    (tono ? ` Tono: ${tono}.` : "");
  const prompt = `Título: ${titulo ?? "(sin título)"}\n\nNota original:\n${contenido}`;
  return { system, prompt };
}

/**
 * Flujo central de la Fase 1: genera N versiones reescritas de una nota.
 * Cada versión se genera en su propio step (reintentos independientes).
 */
export const rewriteArticle = inngest.createFunction(
  {
    id: "rewrite-article",
    concurrency: 5,
    triggers: [{ event: "article/rewrite.requested" }],
  },
  async ({ event, step }) => {
    const {
      articleId,
      nVersiones,
      tono,
      proveedor = "auto",
    } = event.data as RewriteRequested;

    const article = await step.run("load-article", async () => {
      const [row] = await db
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);
      if (!row) throw new Error(`Article ${articleId} no encontrado`);
      return row;
    });

    const [job] = await db
      .insert(rewriteJobs)
      .values({ articleId, nVersiones, tono, proveedor, estado: "generando" })
      .returning();

    const { system, prompt } = buildPrompt(
      article.titulo,
      article.contenido ?? "",
      tono,
    );

    for (let i = 0; i < nVersiones; i++) {
      await step.run(`generate-version-${i}`, async () => {
        const result = await generate({ system, prompt }, proveedor);
        await db.insert(versions).values({
          articleId,
          rewriteJobId: job?.id,
          contenido: result.text,
          proveedor: result.provider,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          estado: "en_revision",
        });
      });
    }

    if (job) {
      await db
        .update(rewriteJobs)
        .set({ estado: "completado", updatedAt: new Date() })
        .where(eq(rewriteJobs.id, job.id));
    }

    return { articleId, generadas: nVersiones };
  },
);

export const functions = [rewriteArticle];
