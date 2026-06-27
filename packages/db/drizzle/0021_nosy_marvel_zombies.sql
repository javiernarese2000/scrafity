ALTER TYPE "public"."video_render_status" ADD VALUE 'pausado' BEFORE 'procesando';--> statement-breakpoint
ALTER TABLE "video_renders" ADD COLUMN "thumbnail_url" text;