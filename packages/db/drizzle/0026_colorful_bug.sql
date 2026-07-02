ALTER TABLE "social_publications" ADD COLUMN "tipo" text DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_renders" ADD COLUMN "tipo" text DEFAULT 'video' NOT NULL;