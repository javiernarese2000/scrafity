CREATE TYPE "public"."article_curacion" AS ENUM('pendiente', 'aprobada', 'descartada');--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "curacion" "article_curacion" DEFAULT 'aprobada' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "escenario_id" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_escenario_id_escenarios_id_fk" FOREIGN KEY ("escenario_id") REFERENCES "public"."escenarios"("id") ON DELETE set null ON UPDATE no action;