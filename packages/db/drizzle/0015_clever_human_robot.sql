CREATE TYPE "public"."area" AS ENUM('noticias', 'redes', 'ambos');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "area" "area" DEFAULT 'ambos' NOT NULL;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;