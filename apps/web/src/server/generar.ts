import { articles, db, rewriteJobs, versions } from "@scrapify/db";
import { eq } from "drizzle-orm";

import { generate, type ProviderName } from "@/ai";
import { buildRewritePrompt, parseRewrite } from "@/ai/prompt";
import { CATEGORIAS, canonizarCategoria } from "@/lib/categorias";
import { computeSimilarity } from "@/lib/diff";
import { getAjustes } from "./ajustes";

export type GenerarParams = {
  nVersiones: number;
  tono: string;
  proveedor: ProviderName | "auto";
  // Escenario que disparó la generación (flujo automático); null en el manual.
  escenarioId?: string | null;
};

/** Sugiere 2–4 etiquetas para la nota (la primera es la categoría general). */
export async function clasificarTags(
  titulo: string,
  contenido: string,
  proveedor: ProviderName | "auto",
  categorias: string[] = CATEGORIAS,
): Promise<string[]> {
  try {
    const r = await generate(
      {
        system:
          "Clasificá la noticia. Devolvé SOLO 2 a 4 etiquetas separadas por comas, " +
          "en español, sin numerar ni explicar. La PRIMERA etiqueta es la categoría " +
          "general y DEBE ser EXACTAMENTE una de esta lista (elegí la más cercana): " +
          categorias.join(", ") +
          ". Las siguientes son temas libres y específicos en minúsculas. Si el " +
          "contenido es atemporal/evergreen, agregá la etiqueta 'evergreen'.",
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

const MAX_INTENTOS = 3;

type VersionGenerada = {
  titulo: string;
  contenido: string;
  similarity: number;
  provider: ProviderName;
  tokensIn: number | null;
  tokensOut: number | null;
};

/**
 * Genera UNA versión y, si queda muy parecida al original (> objetivo), reintenta
 * con una instrucción más dura. Se queda con la de menor similitud.
 */
async function generarUnaVersion(
  titulo: string,
  contenido: string,
  params: GenerarParams,
  objetivo: number,
): Promise<VersionGenerada> {
  let mejor: VersionGenerada | null = null;
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const refuerzo =
      intento === 0
        ? undefined
        : `ATENCIÓN: el intento anterior quedó demasiado parecido al original ` +
          `(${Math.round((mejor?.similarity ?? 0) * 100)}% de frases idénticas). ` +
          `Alejate MUCHO más: reescribí cada oración desde cero, cambiá radicalmente ` +
          `el orden y el fraseo, y NO copies bloques del medio del texto.`;
    const { system, prompt } = buildRewritePrompt(
      titulo,
      contenido,
      params.tono,
      refuerzo,
    );
    const r = await generate(
      {
        system,
        prompt,
        temperature: Math.min(1, 0.9 + intento * 0.05),
        maxTokens: 3000,
      },
      params.proveedor,
    );
    const parsed = parseRewrite(r.text, titulo);
    const cand: VersionGenerada = {
      titulo: parsed.titulo,
      contenido: parsed.contenido,
      similarity: computeSimilarity(contenido, parsed.contenido),
      provider: r.provider,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
    };
    if (!mejor || cand.similarity < mejor.similarity) mejor = cand;
    if (cand.similarity <= objetivo) break;
  }
  return mejor!;
}

/**
 * Motor compartido (Paso A): dada una nota YA creada, genera N versiones
 * `en_revision` con el prompt anti-plagio, calcula similitud y clasifica tags.
 * Lo usan tanto el flujo manual (Pegar URL, síncrono) como el automático
 * (ingesta / job Inngest). Devuelve cuántas versiones generó.
 */
export async function generarVersionesCore(
  articleId: string,
  params: GenerarParams,
): Promise<{ articleId: string; generadas: number }> {
  const [art] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!art) throw new Error(`Article ${articleId} no encontrado`);

  const titulo = art.titulo ?? "(sin título)";
  const contenido = art.contenido ?? "";

  const [job] = await db
    .insert(rewriteJobs)
    .values({
      articleId,
      escenarioId: params.escenarioId ?? null,
      nVersiones: params.nVersiones,
      tono: params.tono,
      proveedor: params.proveedor,
      estado: "generando",
    })
    .returning();

  const { similitudObjetivo } = await getAjustes();

  // Si la nota ya fue clasificada al ingestar, no se reclasifica (evita gasto).
  const yaClasificado = (art.tags?.length ?? 0) > 0;

  try {
    const [versionesGen, tags] = await Promise.all([
      Promise.all(
        Array.from({ length: params.nVersiones }, () =>
          generarUnaVersion(titulo, contenido, params, similitudObjetivo),
        ),
      ),
      yaClasificado
        ? Promise.resolve<string[]>([])
        : clasificarTags(titulo, contenido, params.proveedor),
    ]);

    if (tags.length) {
      await db
        .update(articles)
        .set({ tags, categoria: canonizarCategoria(tags[0]) })
        .where(eq(articles.id, articleId));
    }

    for (const v of versionesGen) {
      await db.insert(versions).values({
        articleId,
        rewriteJobId: job!.id,
        titulo: v.titulo,
        contenido: v.contenido,
        similarityScore: v.similarity,
        proveedor: v.provider,
        tokensIn: v.tokensIn,
        tokensOut: v.tokensOut,
        estado: "en_revision",
      });
    }

    await db
      .update(rewriteJobs)
      .set({ estado: "completado", updatedAt: new Date() })
      .where(eq(rewriteJobs.id, job!.id));

    return { articleId, generadas: versionesGen.length };
  } catch (e) {
    await db
      .update(rewriteJobs)
      .set({
        estado: "error",
        error: e instanceof Error ? e.message : "fallo la generación",
        updatedAt: new Date(),
      })
      .where(eq(rewriteJobs.id, job!.id));
    throw e;
  }
}
