import { articles, db } from "@scrapify/db";
import { desc, isNotNull } from "drizzle-orm";

import { PapeleraBoard, type PapeleraRow } from "@/components/papelera/papelera-board";

export const dynamic = "force-dynamic";

function relativo(date: Date): string {
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export default async function PapeleraPage() {
  const rows = await db
    .select({
      id: articles.id,
      titulo: articles.titulo,
      urlOriginal: articles.urlOriginal,
      deletedAt: articles.deletedAt,
    })
    .from(articles)
    .where(isNotNull(articles.deletedAt))
    .orderBy(desc(articles.deletedAt));

  const items: PapeleraRow[] = rows.map((r) => {
    let fuente = "fuente";
    try {
      fuente = new URL(r.urlOriginal).hostname.replace(/^www\./, "");
    } catch {
      /* noop */
    }
    return {
      id: r.id,
      titulo: r.titulo ?? "(sin título)",
      fuente,
      eliminada: r.deletedAt ? relativo(r.deletedAt) : "",
    };
  });

  return <PapeleraBoard items={items} />;
}
