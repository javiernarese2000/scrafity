import { articles, db, sources } from "@scrapify/db";
import { count } from "drizzle-orm";

import {
  FuentesBoard,
  type FuenteRow,
} from "@/components/fuentes/fuentes-board";

export const dynamic = "force-dynamic";

export default async function FuentesPage() {
  const rows = await db.select().from(sources).orderBy(sources.createdAt);

  const counts = await db
    .select({ sourceId: articles.sourceId, n: count() })
    .from(articles)
    .groupBy(articles.sourceId);
  const bySource = new Map(counts.map((c) => [c.sourceId, Number(c.n)]));

  const fuentes: FuenteRow[] = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre ?? r.url,
    tipo: r.tipo,
    url: r.url,
    estado: r.estado,
    ultimaLectura: r.lastCheck
      ? r.lastCheck.toLocaleDateString("es")
      : "sin lecturas",
    ingestadas: bySource.get(r.id) ?? 0,
  }));

  return <FuentesBoard fuentes={fuentes} />;
}
