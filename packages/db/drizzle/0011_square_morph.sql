ALTER TYPE "public"."publication_status" ADD VALUE 'en_cola' BEFORE 'publicada';--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "cadencia" jsonb;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "categoria" text;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "prioridad" boolean DEFAULT false NOT NULL;