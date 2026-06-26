CREATE TYPE "public"."video_render_status" AS ENUM('en_cola', 'procesando', 'listo', 'error', 'cancelado');--> statement-breakpoint
CREATE TABLE "video_renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid,
	"titulo" text,
	"config" jsonb NOT NULL,
	"source_path" text NOT NULL,
	"output_path" text,
	"output_url" text,
	"estado" "video_render_status" DEFAULT 'en_cola' NOT NULL,
	"progreso" integer DEFAULT 0 NOT NULL,
	"duracion_seg" real,
	"error" text,
	"intentos" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_renders" ADD CONSTRAINT "video_renders_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;