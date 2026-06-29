CREATE TABLE "social_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"actor_nombre" text,
	"accion" text NOT NULL,
	"entidad" text,
	"entidad_id" text,
	"resumen" text NOT NULL,
	"meta" jsonb,
	"resultado" text DEFAULT 'ok' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "social_audit_log_created_idx" ON "social_audit_log" USING btree ("created_at");