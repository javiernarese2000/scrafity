ALTER TABLE "destinations" ADD COLUMN "categorias" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "programada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "categoria" text;