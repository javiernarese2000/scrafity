import { articles, db, publications, versions } from "@scrapify/db";
import { count, desc, eq } from "drizzle-orm";

import { BibliotecaBoard } from "@/components/biblioteca/biblioteca-board";
import { deriveEstado, type NotaCard } from "@/components/biblioteca/types";

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

export default async function BibliotecaPage() {
  const arts = await db
    .select()
    .from(articles)
    .orderBy(desc(articles.createdAt));

  const vers = await db
    .select({
      articleId: versions.articleId,
      titulo: versions.titulo,
      estado: versions.estado,
      similarity: versions.similarityScore,
    })
    .from(versions);

  const pubs = await db
    .select({ articleId: versions.articleId, n: count() })
    .from(publications)
    .innerJoin(versions, eq(publications.versionId, versions.id))
    .groupBy(versions.articleId);
  const pubByArticle = new Map(pubs.map((p) => [p.articleId, Number(p.n)]));

  const versByArticle = new Map<string, typeof vers>();
  for (const v of vers) {
    const list = versByArticle.get(v.articleId) ?? [];
    list.push(v);
    versByArticle.set(v.articleId, list);
  }

  const notas: NotaCard[] = arts.map((a) => {
    const vs = versByArticle.get(a.id) ?? [];
    const estados = vs.map((v) => v.estado);
    const chosen =
      vs.find((v) => v.estado === "aprobada") ??
      vs.find((v) => v.estado === "publicada") ??
      vs[0];
    const sims = vs.map((v) => v.similarity).filter((s): s is number => s != null);
    let fuente = "fuente";
    try {
      fuente = new URL(a.urlOriginal).hostname.replace(/^www\./, "");
    } catch {
      /* noop */
    }
    return {
      id: a.id,
      titulo: chosen?.titulo ?? a.titulo ?? "(sin título)",
      fuente,
      fecha: relativo(a.createdAt),
      imagenUrl: a.imagenUrl,
      estado: deriveEstado(a.archivada, estados),
      tags: a.tags ?? [],
      nVersiones: vs.length,
      similarity: sims.length ? Math.min(...sims) : null,
      destinos: pubByArticle.get(a.id) ?? 0,
      archivada: a.archivada,
    };
  });

  return <BibliotecaBoard notas={notas} />;
}
