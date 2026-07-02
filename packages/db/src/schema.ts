import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (ver memory/04-modelo-de-datos.md)
// ---------------------------------------------------------------------------
export const userRole = pgEnum("user_role", ["admin", "moderador"]);
export const sourceType = pgEnum("source_type", ["rss", "api", "url"]);
export const sourceStatus = pgEnum("source_status", ["activa", "pausada", "error"]);
export const jobStatus = pgEnum("job_status", [
  "pendiente",
  "generando",
  "completado",
  "error",
]);
export const aiProvider = pgEnum("ai_provider", ["deepseek", "claude", "auto"]);
export const versionStatus = pgEnum("version_status", [
  "borrador",
  "en_revision",
  "aprobada",
  "rechazada",
  "publicada",
]);
export const destinationType = pgEnum("destination_type", [
  "wordpress_cliente",
  "sitio_propio",
]);
export const publicationStatus = pgEnum("publication_status", [
  "pendiente",
  "en_cola",
  "publicada",
  "error",
]);

// Config de ritmo de despacho por destino (bandeja de salida).
export type Cadencia = {
  cantidad: number; // cuántas notas por tanda
  cadaMinutos: number; // cada cuánto sale una tanda
  franjaInicio: number; // hora 0-23 desde la que se despacha
  franjaFin: number; // hora 0-23 hasta la que se despacha
  modo: "equilibrado" | "random"; // cómo elige la próxima
  activo: boolean; // si el despachador automático está encendido
};
// Curaduría previa: lo ingestado entra crudo y un humano decide antes de gastar IA.
export const articleCuracion = pgEnum("article_curacion", [
  "pendiente",
  "aprobada",
  "descartada",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// ---------------------------------------------------------------------------
// Tablas
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nombre: text("nombre"),
  rol: userRole("rol").notNull().default("moderador"),
  ...timestamps,
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: sourceType("tipo").notNull(),
  url: text("url").notNull(),
  nombre: text("nombre"),
  // Categoría/sección de la fuente (Deportes, Economía…). Permite "Traer por
  // categoría" en Noticias. null = sin clasificar (fuente general).
  categoria: text("categoria"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  estado: sourceStatus("estado").notNull().default("activa"),
  lastCheck: timestamp("last_check", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    // Estado de curaduría: 'aprobada' por defecto (flujo manual y datos previos);
    // la ingesta crea las notas como 'pendiente' hasta que un humano aprueba.
    curacion: articleCuracion("curacion").notNull().default("aprobada"),
    // Categoría editorial de la nota (la sugiere la IA, editable). Se usa para
    // las columnas de la bandeja y como categoría en WordPress.
    categoria: text("categoria"),
    // Escenario que matcheó en la ingesta (define params de generación al aprobar).
    escenarioId: uuid("escenario_id").references(() => escenarios.id, {
      onDelete: "set null",
    }),
    urlOriginal: text("url_original").notNull(),
    autor: text("autor"),
    titulo: text("titulo"),
    contenido: text("contenido"),
    // Hash del contenido para detección de duplicados (ver memory/06-robustez.md).
    hashContenido: text("hash_contenido"),
    // Snapshot del original para atribución/trazabilidad legal.
    snapshotOriginal: text("snapshot_original"),
    // Imagen principal de la nota (puede dejarse, eliminarse o reemplazarse).
    imagenUrl: text("imagen_url"),
    // Galería de imágenes subidas para usar como portadas.
    imagenes: text("imagenes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Biblioteca: archivado (evergreen) y etiquetas (IA sugiere + edición manual).
    archivada: boolean("archivada").notNull().default(false),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Papelera (soft delete): si tiene fecha, está en la papelera; null = activa.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    fechaOriginal: timestamp("fecha_original", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("articles_hash_idx").on(t.hashContenido)],
);

export const rewriteJobs = pgTable("rewrite_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  // Escenario que disparó el job (flujo automático); null en el manual.
  escenarioId: uuid("escenario_id").references(() => escenarios.id, {
    onDelete: "set null",
  }),
  nVersiones: integer("n_versiones").notNull().default(1),
  tono: text("tono"),
  proveedor: aiProvider("proveedor").notNull().default("auto"),
  estado: jobStatus("estado").notNull().default("pendiente"),
  error: text("error"),
  ...timestamps,
});

export const versions = pgTable("versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  rewriteJobId: uuid("rewrite_job_id").references(() => rewriteJobs.id, {
    onDelete: "set null",
  }),
  titulo: text("titulo"),
  contenido: text("contenido").notNull(),
  // 0..1: parecido con el original (alerta de plagio).
  similarityScore: real("similarity_score"),
  proveedor: aiProvider("proveedor"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costo: numeric("costo", { precision: 10, scale: 6 }),
  estado: versionStatus("estado").notNull().default("borrador"),
  editadoPor: uuid("editado_por").references(() => users.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: destinationType("tipo").notNull(),
  nombre: text("nombre").notNull(),
  // Categorías que publica este sitio. La ingesta trae/filtra según ellas.
  categorias: text("categorias")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  configApi: jsonb("config_api").$type<Record<string, unknown>>().default({}),
  // Credenciales cifradas (nunca en texto plano).
  credencialesCifradas: text("credenciales_cifradas"),
  // Ritmo de despacho de la bandeja de salida (null = sin auto-despacho).
  cadencia: jsonb("cadencia").$type<Cadencia>(),
  estado: sourceStatus("estado").notNull().default("activa"),
  ...timestamps,
});

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    estado: publicationStatus("estado").notNull().default("pendiente"),
    // Momento programado de publicación (Calendario). null = despacho inmediato
    // por cadencia (comportamiento previo); con fecha futura, el despachador espera.
    programadaEn: timestamp("programada_en", { withTimezone: true }),
    // Categoría (1er tag de la nota) para agrupar en la bandeja por columnas.
    categoria: text("categoria"),
    // Marca de prioridad: el despachador la suelta antes que el resto.
    prioridad: boolean("prioridad").notNull().default(false),
    // Portada elegida para este destino (cae a articles.imagen_url si es null).
    imagenUrl: text("imagen_url"),
    urlPublicada: text("url_publicada"),
    externalId: text("external_id"),
    // Evita publicar dos veces si un job se reintenta.
    idempotencyKey: text("idempotency_key").notNull(),
    error: text("error"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("publications_idempotency_idx").on(t.idempotencyKey),
  ],
);

/** Progreso por fuente dentro de una corrida de ingesta. */
export type FuenteProgreso = {
  nombre: string;
  estado: "pendiente" | "corriendo" | "ok" | "error";
  nuevas: number;
  generadas: number;
};

export const ingestRuns = pgTable("ingest_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  // corriendo | completado | error
  estado: text("estado").notNull().default("corriendo"),
  nuevas: integer("nuevas").notNull().default(0),
  generadas: integer("generadas").notNull().default(0),
  saltadas: integer("saltadas").notNull().default(0),
  errores: text("errores")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  fuentes: jsonb("fuentes")
    .$type<FuenteProgreso[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// Configuración global de la plataforma (una sola fila, id 'global').
export type AjustesConfig = {
  similitudObjetivo: number; // 0..1 — tope de similitud al que apunta la generación
  maxPorFuente: number; // ítems nuevos por fuente por corrida de ingesta
  retencionDias: number; // días antes de mandar lo descartable a la papelera
  papeleraDias: number; // días en la papelera antes del borrado definitivo
};

export const ajustes = pgTable("ajustes", {
  id: text("id").primaryKey().default("global"),
  config: jsonb("config").$type<AjustesConfig>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Biblioteca global de imágenes reutilizables, con tags para búsqueda.
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  // Ruta en Storage (para poder borrar el archivo).
  path: text("path").notNull(),
  nombre: text("nombre"),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  ...timestamps,
});

export const auditLog = pgTable("audit_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  accion: text("accion").notNull(),
  entidad: text("entidad").notNull(),
  entidadId: text("entidad_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Escenarios (canvas de flujo) — ver memory/07
// ---------------------------------------------------------------------------
export const escenarios = pgTable("escenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  tema: text("tema"),
  keywords: text("keywords")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  nVersiones: integer("n_versiones").notNull().default(3),
  tono: text("tono").notNull().default("Neutro"),
  proveedor: aiProvider("proveedor").notNull().default("auto"),
  moderacion: boolean("moderacion").notNull().default(true),
  cupoDiario: integer("cupo_diario"),
  activo: boolean("activo").notNull().default(true),
  posX: real("pos_x").notNull().default(0),
  posY: real("pos_y").notNull().default(0),
  ...timestamps,
});

export const escenarioFuentes = pgTable(
  "escenario_fuentes",
  {
    escenarioId: uuid("escenario_id")
      .notNull()
      .references(() => escenarios.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
  (t) => [primaryKey({ columns: [t.escenarioId, t.sourceId] })],
);

export const escenarioDestinos = pgTable(
  "escenario_destinos",
  {
    escenarioId: uuid("escenario_id")
      .notNull()
      .references(() => escenarios.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
  (t) => [primaryKey({ columns: [t.escenarioId, t.destinationId] })],
);

export const nodePositions = pgTable("node_positions", {
  key: text("key").primaryKey(),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Relaciones
// ---------------------------------------------------------------------------
export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  source: one(sources, {
    fields: [articles.sourceId],
    references: [sources.id],
  }),
  rewriteJobs: many(rewriteJobs),
  versions: many(versions),
}));

export const rewriteJobsRelations = relations(rewriteJobs, ({ one, many }) => ({
  article: one(articles, {
    fields: [rewriteJobs.articleId],
    references: [articles.id],
  }),
  versions: many(versions),
}));

export const versionsRelations = relations(versions, ({ one, many }) => ({
  article: one(articles, {
    fields: [versions.articleId],
    references: [articles.id],
  }),
  rewriteJob: one(rewriteJobs, {
    fields: [versions.rewriteJobId],
    references: [rewriteJobs.id],
  }),
  publications: many(publications),
}));

export const destinationsRelations = relations(destinations, ({ many }) => ({
  publications: many(publications),
}));

export const publicationsRelations = relations(publications, ({ one }) => ({
  version: one(versions, {
    fields: [publications.versionId],
    references: [versions.id],
  }),
  destination: one(destinations, {
    fields: [publications.destinationId],
    references: [destinations.id],
  }),
}));
