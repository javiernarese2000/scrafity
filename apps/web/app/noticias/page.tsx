import { articles, db, destinations, sources } from "@scrapify/db";
import { and, desc, eq, isNull } from "drizzle-orm";

import { NoticiasBoard, type NotaFeed } from "@/components/noticias/noticias-board";

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
  return texto.length > 200 ? `${texto.slice(0, 200).replace(/\s+\S*$/, "")}…` : texto;
}

export default async function NoticiasPage() {
  const [rows, dests, fuentesRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        titulo: articles.titulo,
        contenido: articles.contenido,
        urlOriginal: articles.urlOriginal,
        imagenUrl: articles.imagenUrl,
        categoria: articles.categoria,
        createdAt: articles.createdAt,
        fuente: sources.nombre,
      })
      .from(articles)
      .leftJoin(sources, eq(articles.sourceId, sources.id))
      .where(and(eq(articles.curacion, "pendiente"), isNull(articles.deletedAt)))
      .orderBy(desc(articles.createdAt)),
    db
      .select({ id: destinations.id, nombre: destinations.nombre, categorias: destinations.categorias })
      .from(destinations),
    db
      .select({ id: sources.id, nombre: sources.nombre, categoria: sources.categoria, url: sources.url })
      .from(sources)
      .where(eq(sources.estado, "activa")),
  ]);

  const fuentes = fuentesRows.map((f) => ({
    id: f.id,
    nombre: f.nombre ?? f.url,
    categoria: f.categoria,
  }));

  const notas: NotaFeed[] = rows.map((r) => {
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
      categoria: r.categoria,
      resumen: resumen(r.contenido),
      imagenUrl: r.imagenUrl,
      urlOriginal: r.urlOriginal,
      fecha: relativo(r.createdAt),
    };
  });

  const categoriasUnion = [...new Set(dests.flatMap((d) => d.categorias ?? []))];

  return (
    <NoticiasBoard
      notas={notas}
      destinos={dests}
      fuentes={fuentes}
      categorias={categoriasUnion}
    />
  );
}
