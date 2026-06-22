CREATE TABLE "escenario_destinos" (
	"escenario_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	CONSTRAINT "escenario_destinos_escenario_id_destination_id_pk" PRIMARY KEY("escenario_id","destination_id")
);
--> statement-breakpoint
CREATE TABLE "escenario_fuentes" (
	"escenario_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "escenario_fuentes_escenario_id_source_id_pk" PRIMARY KEY("escenario_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "escenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tema" text,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"n_versiones" integer DEFAULT 3 NOT NULL,
	"tono" text DEFAULT 'Neutro' NOT NULL,
	"proveedor" "ai_provider" DEFAULT 'auto' NOT NULL,
	"moderacion" boolean DEFAULT true NOT NULL,
	"cupo_diario" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"pos_x" real DEFAULT 0 NOT NULL,
	"pos_y" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_positions" (
	"key" text PRIMARY KEY NOT NULL,
	"x" real DEFAULT 0 NOT NULL,
	"y" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escenario_destinos" ADD CONSTRAINT "escenario_destinos_escenario_id_escenarios_id_fk" FOREIGN KEY ("escenario_id") REFERENCES "public"."escenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escenario_destinos" ADD CONSTRAINT "escenario_destinos_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escenario_fuentes" ADD CONSTRAINT "escenario_fuentes_escenario_id_escenarios_id_fk" FOREIGN KEY ("escenario_id") REFERENCES "public"."escenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escenario_fuentes" ADD CONSTRAINT "escenario_fuentes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;