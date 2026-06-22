import { articles, db, publications, versions } from "@scrapify/db";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ destinoId: string }> },
) {
  const { destinoId } = await params;

  const rows = await db
    .select({
      titulo: versions.titulo,
      contenido: versions.contenido,
      imagenUrl: publications.imagenUrl,
      imagenNota: articles.imagenUrl,
      urlOriginal: articles.urlOriginal,
      publicadaEn: publications.createdAt,
    })
    .from(publications)
    .innerJoin(versions, eq(publications.versionId, versions.id))
    .innerJoin(articles, eq(versions.articleId, articles.id))
    .where(
      and(
        eq(publications.destinationId, destinoId),
        eq(publications.estado, "publicada"),
      ),
    )
    .orderBy(desc(publications.createdAt));

  const items = rows.map((r) => ({
    titulo: r.titulo,
    contenido: r.contenido,
    imagenUrl: r.imagenUrl ?? r.imagenNota,
    urlOriginal: r.urlOriginal,
    publicadaEn: r.publicadaEn,
  }));

  return Response.json({ destino: destinoId, total: items.length, items });
}
