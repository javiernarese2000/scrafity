import { articles, db, versions } from "@scrapify/db";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { NotaDetalle } from "@/components/biblioteca/nota-detalle";
import { deriveEstado, type NotaDetalleData } from "@/components/biblioteca/types";

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

export default async function NotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [art] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!art) notFound();

  const vs = await db
    .select()
    .from(versions)
    .where(eq(versions.articleId, id))
    .orderBy(desc(versions.createdAt));

  const chosen =
    vs.find((v) => v.estado === "aprobada") ??
    vs.find((v) => v.estado === "publicada") ??
    vs[0];

  let fuente = "fuente";
  try {
    fuente = new URL(art.urlOriginal).hostname.replace(/^www\./, "");
  } catch {
    /* noop */
  }

  const data: NotaDetalleData = {
    id: art.id,
    titulo: chosen?.titulo ?? art.titulo ?? "(sin título)",
    fuente,
    fecha: relativo(art.createdAt),
    urlOriginal: art.urlOriginal,
    imagenUrl: art.imagenUrl,
    estado: deriveEstado(
      art.archivada,
      vs.map((v) => v.estado),
    ),
    archivada: art.archivada,
    tags: art.tags ?? [],
    original: art.snapshotOriginal ?? art.contenido ?? "",
    contenido: chosen?.contenido ?? art.contenido ?? "",
    nVersiones: vs.length,
    imagenes: art.imagenes ?? [],
  };

  return <NotaDetalle data={data} />;
}
