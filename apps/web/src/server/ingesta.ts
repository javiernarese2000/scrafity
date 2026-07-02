import crypto from "node:crypto";

import {
  articles,
  db,
  destinations,
  escenarioFuentes,
  escenarios,
  type FuenteProgreso,
  ingestRuns,
  sources,
} from "@scrapify/db";
import { and, eq, gte, inArray } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";

import type { ProviderName } from "@/ai";
import { CATEGORIAS, canonizarCategoria } from "@/lib/categorias";
import { getAjustes } from "./ajustes";
import { clasificarTags } from "./generar";
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

/** Empareja la categoría que devolvió la IA con la lista objetivo (case-insensitive). */
function emparejarCategoria(raw: string, lista: string[]): string {
  const k = raw.trim().toLowerCase();
  return lista.find((c) => c.toLowerCase() === k) ?? canonizarCategoria(raw);
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
  // Alcance opcional (botón "Traer noticias"). Sin nada = todas las activas.
  sourceIds?: string[];
  // Filtro por categoría de la NOTA (clasificada al ingestar). Ingesta dirigida.
  categorias?: string[];
  maxPorFuente?: number;
  palabra?: string;
}): Promise<ResultadoIngesta> {
  const runId = opts?.runId;
  const palabra = opts?.palabra?.trim().toLowerCase() || null;
  const res: ResultadoIngesta = {
    fuentes: 0,
    nuevas: 0,
    generadas: 0,
    saltadas: 0,
    errores: [],
  };

  const maxPorFuente = opts?.maxPorFuente ?? (await getAjustes()).maxPorFuente;

  const filtros = [eq(sources.tipo, "rss"), eq(sources.estado, "activa")];
  if (opts?.sourceIds && opts.sourceIds.length > 0) {
    filtros.push(inArray(sources.id, opts.sourceIds));
  }
  const activas = await db
    .select()
    .from(sources)
    .where(and(...filtros));

  // Categorías objetivo para clasificar (unión de las que publican los destinos;
  // si no hay ninguna, la taxonomía canónica) y filtro pedido (ingesta dirigida).
  const destinosCats = await db
    .select({ categorias: destinations.categorias })
    .from(destinations);
  const union = [...new Set(destinosCats.flatMap((d) => d.categorias ?? []))];
  const categoriasObjetivo = union.length > 0 ? union : CATEGORIAS;
  const categoriasFiltro = (opts?.categorias ?? []).map((c) => c.toLowerCase());

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
        // Filtro por palabra (corrida ad-hoc de "Traer noticias").
        const texto = `${item.titulo} ${item.resumen}`;
        if (palabra && !texto.toLowerCase().includes(palabra)) {
          res.saltadas += 1;
          continue;
        }

        // Match de escenario OPCIONAL (params/ruteo). Si ninguno matchea o todos
        // están sin cupo, la nota igual se crea (escenarioId null) — desacoplado.
        let esc: EscenarioMatch | null = null;
        for (const e of escs) {
          if (!coincide(e, texto)) continue;
          if (e.cupoDiario != null && (await notasHoy(e.id)) >= e.cupoDiario) continue;
          esc = e;
          break;
        }

        // Extracción del cuerpo completo (keyless; Firecrawl será el plan B).
        const ext = await extraerNota(item.link);
        if (!ext.ok) {
          res.saltadas += 1;
          continue;
        }

        // Clasificación al ingestar (categoría REAL). Apunta a las categorías de
        // los destinos. Se hace ANTES de insertar para poder filtrar.
        let categoria: string | null = null;
        let tags: string[] = [];
        try {
          tags = await clasificarTags(ext.titulo, ext.contenido, "auto", categoriasObjetivo);
          categoria = tags.length ? emparejarCategoria(tags[0]!, categoriasObjetivo) : null;
        } catch {
          // sin categoría si la IA falla
        }

        // Ingesta dirigida por categoría: si se pidieron ciertas categorías y la
        // nota no cae en ellas, se descarta (no se guarda).
        if (
          categoriasFiltro.length > 0 &&
          (!categoria || !categoriasFiltro.includes(categoria.toLowerCase()))
        ) {
          res.saltadas += 1;
          continue;
        }

        const hash = crypto
          .createHash("sha256")
          .update(ext.contenido)
          .digest("hex");
        // Se crea CRUDA (curacion 'pendiente'): la IA recién genera al aprobar.
        const [art] = await db
          .insert(articles)
          .values({
            sourceId: fuente.id,
            curacion: "pendiente",
            escenarioId: esc?.id ?? null,
            urlOriginal: item.link,
            titulo: ext.titulo,
            contenido: ext.contenido,
            hashContenido: hash,
            snapshotOriginal: ext.contenido,
            imagenUrl: ext.imagenUrl,
            categoria,
            tags,
          })
          .onConflictDoNothing()
          .returning();
        if (!art) continue; // hash duplicado

        res.nuevas += 1;
        pf.nuevas += 1;
        procesadas += 1;
        if (esc) cupoUsado.set(esc.id, (cupoUsado.get(esc.id) ?? 0) + 1);
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
