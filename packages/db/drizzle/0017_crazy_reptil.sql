CREATE TYPE "public"."social_publication_status" AS ENUM('pendiente', 'en_cola', 'publicada', 'error');--> statement-breakpoint
CREATE TABLE "social_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"social_account_id" uuid,
	"plataforma" "social_platform" NOT NULL,
	"video_titulo" text,
	"caption" text,
	"url_nota" text,
	"estado" "social_publication_status" DEFAULT 'pendiente' NOT NULL,
	"url_publicada" text,
	"external_id" text,
	"error" text,
	"publicada_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE set null ON UPDATE no action;