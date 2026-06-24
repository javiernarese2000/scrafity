import { articles, db, escenarios, sources } from "@scrapify/db";
import { and, desc, eq, isNull } from "drizzle-orm";

import { CuraduriaBoard, type EntradaRow } from "@/components/curaduria/curaduria-board";

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

function resumen(md: string | null): string {
  if (!md) return "";
  const texto = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return texto.length > 240 ? `${texto.slice(0, 240).replace(/\s+\S*$/, "")}…` : texto;
}

export default async function CuraduriaPage() {
  const rows = await db
    .select({
      id: articles.id,
      titulo: articles.titulo,
      contenido: articles.contenido,
      urlOriginal: articles.urlOriginal,
      imagenUrl: articles.imagenUrl,
      createdAt: articles.createdAt,
      escenario: escenarios.nombre,
      fuente: sources.nombre,
    })
    .from(articles)
    .leftJoin(escenarios, eq(articles.escenarioId, escenarios.id))
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(eq(articles.curacion, "pendiente"), isNull(articles.deletedAt)))
    .orderBy(desc(articles.createdAt));

  const entradas: EntradaRow[] = rows.map((r) => {
    let fuente = r.fuente ?? "fuente";
    if (!r.fuente) {
      try {
        fuente = new URL(r.urlOriginal).hostname.replace(/^www\./, "");
      } catch {
        /* noop */
      }
    }
    return {
      id: r.id,
      titulo: r.titulo ?? "(sin título)",
      fuente,
      escenario: r.escenario,
      resumen: resumen(r.contenido),
      imagenUrl: r.imagenUrl,
      urlOriginal: r.urlOriginal,
      fecha: relativo(r.createdAt),
    };
  });

  return <CuraduriaBoard entradas={entradas} />;
}
