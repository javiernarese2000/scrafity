ALTER TABLE "social_publications" ADD COLUMN "video_render_id" uuid;--> statement-breakpoint
ALTER TABLE "social_publications" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_video_render_id_video_renders_id_fk" FOREIGN KEY ("video_render_id") REFERENCES "public"."video_renders"("id") ON DELETE set null ON UPDATE no action;