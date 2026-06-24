import { articles, db, versions } from "@scrapify/db";
import { and, eq, inArray, isNotNull, isNull, lt, notExists } from "drizzle-orm";

import { getAjustes } from "./ajustes";

const enDias = (n: number) => new Date(Date.now() - n * 86_400_000);

export type ResultadoRetencion = { aPapelera: number; purgadas: number };

/**
 * Política de retención:
 * 1) Lo DESCARTABLE y viejo (> TTL_DIAS) va a la papelera: notas no archivadas,
 *    sin ninguna versión publicada/aprobada (rechazadas, descartadas, fallidas,
 *    borradores en revisión abandonados). NUNCA toca archivadas ni publicadas.
 * 2) Lo que ya lleva > PAPELERA_DIAS en la papelera se borra definitivamente.
 */
export async function aplicarRetencion(): Promise<ResultadoRetencion> {
  const { retencionDias, papeleraDias } = await getAjustes();

  // Subconsulta correlacionada: ¿la nota tiene alguna versión "valiosa"?
  const tieneVersionValiosa = db
    .select({ x: versions.id })
    .from(versions)
    .where(
      and(
        eq(versions.articleId, articles.id),
        inArray(versions.estado, ["publicada", "aprobada"]),
      ),
    );

  const aPapelera = await db
    .update(articles)
    .set({ deletedAt: new Date() })
    .where(
      and(
        isNull(articles.deletedAt),
        eq(articles.archivada, false),
        lt(articles.createdAt, enDias(retencionDias)),
        notExists(tieneVersionValiosa),
      ),
    )
    .returning({ id: articles.id });

  const purgadas = await db
    .delete(articles)
    .where(
      and(
        isNotNull(articles.deletedAt),
        lt(articles.deletedAt, enDias(papeleraDias)),
      ),
    )
    .returning({ id: articles.id });

  return { aPapelera: aPapelera.length, purgadas: purgadas.length };
}
