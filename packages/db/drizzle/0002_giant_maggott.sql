ALTER TABLE "articles" ADD COLUMN "archivada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;