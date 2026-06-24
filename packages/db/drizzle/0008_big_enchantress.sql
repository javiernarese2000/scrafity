CREATE TABLE "ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estado" text DEFAULT 'corriendo' NOT NULL,
	"nuevas" integer DEFAULT 0 NOT NULL,
	"generadas" integer DEFAULT 0 NOT NULL,
	"saltadas" integer DEFAULT 0 NOT NULL,
	"errores" text[] DEFAULT '{}'::text[] NOT NULL,
	"fuentes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
