CREATE TYPE "public"."social_account_status" AS ENUM('conectada', 'desconectada', 'error');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'facebook', 'tiktok');--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"plataforma" "social_platform" NOT NULL,
	"nombre" text NOT NULL,
	"external_id" text,
	"estado" "social_account_status" DEFAULT 'desconectada' NOT NULL,
	"credenciales_cifradas" text,
	"expira_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;