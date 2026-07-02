import { db, destinations, publications } from "@scrapify/db";
import { count } from "drizzle-orm";

import {
  DestinosBoard,
  type DestinoRow,
} from "@/components/destinos/destinos-board";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function DestinosPage() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(destinations)
    .orderBy(destinations.createdAt);

  const counts = await db
    .select({ destinationId: publications.destinationId, n: count() })
    .from(publications)
    .groupBy(publications.destinationId);
  const byDest = new Map(counts.map((c) => [c.destinationId, Number(c.n)]));

  const destinos: DestinoRow[] = rows.map((r) => {
    const cfg = (r.configApi ?? {}) as { url?: string };
    return {
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      endpoint: cfg.url ?? "—",
      categorias: r.categorias ?? [],
      activo: r.estado === "activa",
      publicadas: byDest.get(r.id) ?? 0,
    };
  });

  return <DestinosBoard destinos={destinos} />;
}
