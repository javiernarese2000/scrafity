import { despachar } from "@/server/despachador";
import { generarVersionesCore } from "@/server/generar";
import { ingestarFuentes } from "@/server/ingesta";
import { aplicarRetencion } from "@/server/retencion";
import { inngest, type RewriteRequested } from "./client";

/**
 * Genera N versiones de una nota ya creada, usando el motor compartido
 * (mismo prompt anti-plagio, similitud y tags que el flujo manual — Paso A).
 */
export const rewriteArticle = inngest.createFunction(
  {
    id: "rewrite-article",
    concurrency: 5,
    triggers: [{ event: "article/rewrite.requested" }],
  },
  async ({ event, step }) => {
    const {
      articleId,
      nVersiones,
      tono = "Neutro",
      proveedor = "auto",
      escenarioId = null,
    } = event.data as RewriteRequested;

    return step.run("generar-versiones", () =>
      generarVersionesCore(articleId, {
        nVersiones,
        tono,
        proveedor,
        escenarioId,
      }),
    );
  },
);

/**
 * Ingesta automática (Paso C): lee fuentes RSS activas, deduplica, crea
 * artículos, matchea escenarios por keywords y genera versiones con cupo.
 * Corre por cron y también por evento manual (botón "Ingestar ahora").
 */
export const ingestSources = inngest.createFunction(
  {
    id: "ingest-sources",
    concurrency: 1,
    triggers: [
      { cron: "*/15 * * * *" },
      { event: "sources/ingest.requested" },
    ],
  },
  async ({ step }) => {
    return step.run("ingestar-fuentes", () => ingestarFuentes());
  },
);

/**
 * Retención (ciclo de vida): a diario manda lo descartable viejo a la papelera
 * y purga definitivamente lo que lleva mucho en ella.
 */
export const retencion = inngest.createFunction(
  {
    id: "retencion",
    concurrency: 1,
    triggers: [
      { cron: "0 4 * * *" },
      { event: "retencion/run.requested" },
    ],
  },
  async ({ step }) => {
    return step.run("aplicar-retencion", () => aplicarRetencion());
  },
);

/**
 * Despachador de la bandeja de salida: cada 10 min suelta de la cola según la
 * cadencia configurada por destino (cantidad, franja horaria, modo).
 */
export const despacharCola = inngest.createFunction(
  {
    id: "despachar-cola",
    concurrency: 1,
    triggers: [
      { cron: "*/10 * * * *" },
      { event: "cola/despachar.requested" },
    ],
  },
  async ({ step }) => {
    return step.run("despachar", () => despachar());
  },
);

export const functions = [
  rewriteArticle,
  ingestSources,
  retencion,
  despacharCola,
];
