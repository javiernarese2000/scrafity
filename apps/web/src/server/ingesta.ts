import crypto from "node:crypto";

import {
  articles,
  db,
  escenarioFuentes,
  escenarios,
  type FuenteProgreso,
  ingestRuns,
  sources,
} from "@scrapify/db";
import { and, eq, gte } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";

import type { ProviderName } from "@/ai";
import { getAjustes } from "./ajustes";
import { extraerNota } from "./notas";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

type FeedItem = { titulo: string; link: string; resumen: string };

/** Coacciona a string un campo que puede venir como objeto {#text} o array. */
function txt(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return txt(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("#text" in o) return String(o["#text"]);
    if ("@_href" in o) return String(o["@_href"]);
  }
  return String(v);
}

/** Extrae el link de un ítem RSS (string) o Atom (array de {@_href}). */
function getLink(item: Record<string, unknown>): string {
  const l = item.link;
  if (typeof l === "string") return l;
  if (Array.isArray(l)) {
    const alt = l.find(
      (x) => (x as Record<string, unknown>)?.["@_rel"] === "alternate",
    );
    return txt(alt ?? l[0]);
  }
  return txt(l);
}

function parseFeed(xml: string): FeedItem[] {
  const data = parser.parse(xml) as Record<string, unknown>;
  const rss = data.rss as { channel?: { item?: unknown } } | undefined;
  const feed = data.feed as { entry?: unknown } | undefined;

  const raw = rss?.channel?.item ?? feed?.entry ?? [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items
    .map((it) => {
      const item = it as Record<string, unknown>;
      return {
        titulo: txt(item.title).trim(),
        link: getLink(item).trim(),
        resumen: txt(item.description ?? item.summary).trim(),
      };
    })
    .filter((i) => i.link);
}

type EscenarioMatch = {
  id: string;
  keywords: string[];
  nVersiones: number;
  tono: string;
  proveedor: ProviderName | "auto";
  cupoDiario: number | null;
};

/** Escenarios activos conectados a una fuente, con sus keywords de conexión. */
async function escenariosDeFuente(sourceId: string): Promise<EscenarioMatch[]> {
  const rows = await db
    .select({
      id: escenarios.id,
      activo: escenarios.activo,
      nVersiones: escenarios.nVersiones,
      tono: escenarios.tono,
      proveedor: escenarios.proveedor,
      cupoDiario: escenarios.cupoDiario,
      keywords: escenarioFuentes.keywords,
    })
    .from(escenarioFuentes)
    .innerJoin(escenarios, eq(escenarioFuentes.escenarioId, escenarios.id))
    .where(eq(escenarioFuentes.sourceId, sourceId));

  return rows
    .filter((r) => r.activo)
    .map((r) => ({
      id: r.id,
      keywords: r.keywords ?? [],
      nVersiones: r.nVersiones,
      tono: r.tono,
      proveedor: r.proveedor as ProviderName | "auto",
      cupoDiario: r.cupoDiario,
    }));
}

function coincide(esc: EscenarioMatch, texto: string): boolean {
  if (esc.keywords.length === 0) return true; // sin filtro = todo pasa
  const t = texto.toLowerCase();
  return esc.keywords.some((k) => t.includes(k.toLowerCase()));
}

function inicioDeHoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export type ResultadoIngesta = {
  fuentes: number;
  nuevas: number;
  generadas: number;
  saltadas: number;
  errores: string[];
};

/**
 * Lee las fuentes RSS activas, deduplica por URL/hash, matchea escenarios por
 * keywords y genera versiones con el motor compartido respetando el cupo diario.
 * Si recibe `runId`, va escribiendo el progreso en `ingest_runs` (panel en vivo).
 */
export async function ingestarFuentes(opts?: {
  runId?: string;
}): Promise<ResultadoIngesta> {
  const runId = opts?.runId;
  const res: ResultadoIngesta = {
    fuentes: 0,
    nuevas: 0,
    generadas: 0,
    saltadas: 0,
    errores: [],
  };

  const maxPorFuente = (await getAjustes()).maxPorFuente;

  const activas = await db
    .select()
    .from(sources)
    .where(and(eq(sources.tipo, "rss"), eq(sources.estado, "activa")));

  res.fuentes = activas.length;

  // Estado por fuente para el panel en vivo.
  const prog: FuenteProgreso[] = activas.map((f) => ({
    nombre: f.nombre ?? f.url,
    estado: "pendiente",
    nuevas: 0,
    generadas: 0,
  }));

  async function persist(estado: "corriendo" | "completado" | "error") {
    if (!runId) return;
    await db
      .update(ingestRuns)
      .set({
        estado,
        nuevas: res.nuevas,
        generadas: res.generadas,
        saltadas: res.saltadas,
        errores: res.errores,
        fuentes: prog,
        ...(estado === "corriendo" ? {} : { finishedAt: new Date() }),
      })
      .where(eq(ingestRuns.id, runId));
  }

  await persist("corriendo");

  // Cupo: cuántas notas ingestó hoy cada escenario (controla el tamaño de la cola).
  const cupoUsado = new Map<string, number>();
  async function notasHoy(escenarioId: string): Promise<number> {
    if (cupoUsado.has(escenarioId)) return cupoUsado.get(escenarioId)!;
    const filas = await db
      .select({ id: articles.id })
      .from(articles)
      .where(
        and(
          eq(articles.escenarioId, escenarioId),
          gte(articles.createdAt, inicioDeHoy()),
        ),
      );
    cupoUsado.set(escenarioId, filas.length);
    return filas.length;
  }

  for (let fi = 0; fi < activas.length; fi++) {
    const fuente = activas[fi]!;
    const pf = prog[fi]!;
    pf.estado = "corriendo";
    await persist("corriendo");
    try {
      const feedRes = await fetch(fuente.url, {
        headers: { "user-agent": "ScrapifyBot/0.1 (+https://scrapify.app)" },
      });
      if (!feedRes.ok) throw new Error(`feed respondió ${feedRes.status}`);
      const items = parseFeed(await feedRes.text());

      const escs = await escenariosDeFuente(fuente.id);
      let procesadas = 0;

      for (const item of items) {
        if (procesadas >= maxPorFuente) break;

        // Dedup por URL.
        const [existe] = await db
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.urlOriginal, item.link))
          .limit(1);
        if (existe) continue;

        // Match de escenario: el PRIMERO que matchee por keywords Y tenga cupo
        // libre. (Antes elegía el primero y, si estaba lleno, descartaba la nota
        // sin probar los demás escenarios conectados a la fuente.)
        const texto = `${item.titulo} ${item.resumen}`;
        let esc: EscenarioMatch | null = null;
        for (const e of escs) {
          if (!coincide(e, texto)) continue;
          if (e.cupoDiario != null && (await notasHoy(e.id)) >= e.cupoDiario) continue;
          esc = e;
          break;
        }
        if (!esc) {
          res.saltadas += 1;
          continue;
        }

        // Extracción del cuerpo completo (keyless; Firecrawl será el plan B).
        const ext = await extraerNota(item.link);
        if (!ext.ok) {
          res.saltadas += 1;
          continue;
        }

        const hash = crypto
          .createHash("sha256")
          .update(ext.contenido)
          .digest("hex");
        // Se crea CRUDA (curacion 'pendiente'): la IA recién genera al aprobar
        // en Curaduría. Ahorra tokens y filtra antes de publicar.
        const [art] = await db
          .insert(articles)
          .values({
            sourceId: fuente.id,
            curacion: "pendiente",
            escenarioId: esc.id,
            urlOriginal: item.link,
            titulo: ext.titulo,
            contenido: ext.contenido,
            hashContenido: hash,
            snapshotOriginal: ext.contenido,
            imagenUrl: ext.imagenUrl,
          })
          .onConflictDoNothing()
          .returning();
        if (!art) continue; // hash duplicado

        res.nuevas += 1;
        pf.nuevas += 1;
        procesadas += 1;
        cupoUsado.set(esc.id, (cupoUsado.get(esc.id) ?? 0) + 1);
        await persist("corriendo"); // tick en vivo
      }

      pf.estado = "ok";
      await db
        .update(sources)
        .set({ lastCheck: new Date(), lastError: null, estado: "activa" })
        .where(eq(sources.id, fuente.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error desconocido";
      res.errores.push(`${fuente.nombre ?? fuente.url}: ${msg}`);
      pf.estado = "error";
      await db
        .update(sources)
        .set({ lastCheck: new Date(), lastError: msg, estado: "error" })
        .where(eq(sources.id, fuente.id));
    }
    await persist("corriendo");
  }

  await persist("completado");
  return res;
}
