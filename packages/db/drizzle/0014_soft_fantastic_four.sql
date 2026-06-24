CREATE TABLE "ajustes" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"config" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
