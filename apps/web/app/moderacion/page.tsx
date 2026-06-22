import { articles, db, versions } from "@scrapify/db";
import { desc, eq } from "drizzle-orm";

import { ModerationBoard } from "@/components/moderacion/moderation-board";
import type { NotaView, ProveedorView } from "@/components/moderacion/types";

export const dynamic = "force-dynamic";

function relativo(date: Date): string {
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default async function ModeracionPage() {
  const rows = await db
    .select({
      vId: versions.id,
      vTitulo: versions.titulo,
      vContenido: versions.contenido,
      vSim: versions.similarityScore,
      vProv: versions.proveedor,
      vIn: versions.tokensIn,
      vOut: versions.tokensOut,
      aId: articles.id,
      aTitulo: articles.titulo,
      aUrl: articles.urlOriginal,
      aAutor: articles.autor,
      aOriginal: articles.snapshotOriginal,
      aContenido: articles.contenido,
      aCreated: articles.createdAt,
    })
    .from(versions)
    .innerJoin(articles, eq(versions.articleId, articles.id))
    .where(eq(versions.estado, "en_revision"))
    .orderBy(desc(articles.createdAt));

  const map = new Map<string, NotaView>();
  for (const r of rows) {
    let nota = map.get(r.aId);
    if (!nota) {
      let fuente = "fuente";
      try {
        fuente = new URL(r.aUrl).hostname.replace(/^www\./, "");
      } catch {
        /* noop */
      }
      nota = {
        id: r.aId,
        titulo: r.aTitulo ?? "(sin título)",
        fuente,
        autor: r.aAutor,
        fecha: relativo(r.aCreated),
        urlOriginal: r.aUrl,
        original: r.aOriginal ?? r.aContenido ?? "",
        versiones: [],
      };
      map.set(r.aId, nota);
    }
    nota.versiones.push({
      id: r.vId,
      titulo: r.vTitulo ?? nota.titulo,
      contenido: r.vContenido,
      similarity: r.vSim ?? 0,
      proveedor: (r.vProv as ProveedorView | null) ?? null,
      tokensIn: r.vIn,
      tokensOut: r.vOut,
    });
  }

  return <ModerationBoard notas={[...map.values()]} />;
}
