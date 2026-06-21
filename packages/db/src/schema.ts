import { relations, sql } from "drizzle-orm";
import {
  bigint,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
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
  "publicada",
  "error",
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
    urlOriginal: text("url_original").notNull(),
    autor: text("autor"),
    titulo: text("titulo"),
    contenido: text("contenido"),
    // Hash del contenido para detección de duplicados (ver memory/06-robustez.md).
    hashContenido: text("hash_contenido"),
    // Snapshot del original para atribución/trazabilidad legal.
    snapshotOriginal: text("snapshot_original"),
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
  configApi: jsonb("config_api").$type<Record<string, unknown>>().default({}),
  // Credenciales cifradas (nunca en texto plano).
  credencialesCifradas: text("credenciales_cifradas"),
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
