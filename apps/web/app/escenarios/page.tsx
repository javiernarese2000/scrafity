import {
  db,
  destinations,
  escenarioDestinos,
  escenarioFuentes,
  escenarios,
  nodePositions,
  sources,
} from "@scrapify/db";

import { FlujoCanvas } from "@/components/escenarios/flujo-canvas";
import type {
  GraphData,
  GraphDestino,
  GraphEscenario,
  GraphFuente,
} from "@/components/escenarios/types";

export const dynamic = "force-dynamic";

export default async function EscenariosPage() {
  const [fuentesRows, destinosRows, escRows, efRows, edRows, posRows] =
    await Promise.all([
      db.select().from(sources).orderBy(sources.createdAt),
      db.select().from(destinations).orderBy(destinations.createdAt),
      db.select().from(escenarios).orderBy(escenarios.createdAt),
      db.select().from(escenarioFuentes),
      db.select().from(escenarioDestinos),
      db.select().from(nodePositions),
    ]);

  const pos = new Map(posRows.map((p) => [p.key, { x: p.x, y: p.y }]));
  const at = (key: string, dx: number, dy: number) =>
    pos.get(key) ?? { x: dx, y: dy };

  const fuentes: GraphFuente[] = fuentesRows.map((f, i) => ({
    id: f.id,
    nombre: f.nombre ?? f.url,
    tipo: f.tipo,
    estado: f.estado,
    ...at(`fuente:${f.id}`, 40, 60 + i * 120),
  }));

  const destinos: GraphDestino[] = destinosRows.map((d, i) => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    estado: d.estado,
    ...at(`destino:${d.id}`, 920, 60 + i * 120),
  }));

  const escenariosData: GraphEscenario[] = escRows.map((e, i) => ({
    id: e.id,
    nombre: e.nombre,
    tema: e.tema,
    keywords: e.keywords ?? [],
    nVersiones: e.nVersiones,
    tono: e.tono,
    proveedor: e.proveedor,
    moderacion: e.moderacion,
    cupoDiario: e.cupoDiario,
    activo: e.activo,
    linksFuente: efRows
      .filter((r) => r.escenarioId === e.id)
      .map((r) => ({ refId: r.sourceId, keywords: r.keywords ?? [] })),
    linksDestino: edRows
      .filter((r) => r.escenarioId === e.id)
      .map((r) => ({ refId: r.destinationId, keywords: r.keywords ?? [] })),
    ...at(`escenario:${e.id}`, 480, 60 + i * 160),
  }));

  const data: GraphData = { fuentes, destinos, escenarios: escenariosData };

  return <FlujoCanvas data={data} />;
}
