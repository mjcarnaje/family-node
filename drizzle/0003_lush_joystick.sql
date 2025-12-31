CREATE TYPE "public"."family_member_event_type" AS ENUM('birth', 'death', 'marriage', 'divorce', 'child_born', 'graduation', 'career', 'achievement', 'residence', 'medical', 'military', 'religious', 'other');--> statement-breakpoint
CREATE TYPE "public"."member_media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."story_type" AS ENUM('biography', 'memory', 'story', 'document', 'milestone');--> statement-breakpoint
CREATE TABLE "family_member_event" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"family_member_id" text NOT NULL,
	"event_type" "family_member_event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" date,
	"event_year" integer,
	"location" text,
	"related_member_id" text,
	"is_auto_generated" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_member_story" (
	"id" text PRIMARY KEY NOT NULL,
	"family_member_id" text NOT NULL,
	"family_tree_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"story_type" "story_type" NOT NULL,
	"event_date" date,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_media" (
	"id" text PRIMARY KEY NOT NULL,
	"family_member_id" text NOT NULL,
	"family_tree_id" text NOT NULL,
	"type" "member_media_type" NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"caption" text,
	"position" integer NOT NULL,
	"uploaded_by_user_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_member_event" ADD CONSTRAINT "family_member_event_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_event" ADD CONSTRAINT "family_member_event_family_member_id_family_member_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_event" ADD CONSTRAINT "family_member_event_related_member_id_family_member_id_fk" FOREIGN KEY ("related_member_id") REFERENCES "public"."family_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_story" ADD CONSTRAINT "family_member_story_family_member_id_family_member_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_story" ADD CONSTRAINT "family_member_story_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_story" ADD CONSTRAINT "family_member_story_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_media" ADD CONSTRAINT "member_media_family_member_id_family_member_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_media" ADD CONSTRAINT "member_media_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_media" ADD CONSTRAINT "member_media_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_family_member_event_family_tree_id" ON "family_member_event" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_family_member_event_family_member_id" ON "family_member_event" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "idx_family_member_event_event_date" ON "family_member_event" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "idx_family_member_event_event_type" ON "family_member_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_story_family_member_id" ON "family_member_story" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "idx_story_family_tree_id" ON "family_member_story" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_story_created_at" ON "family_member_story" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_story_story_type" ON "family_member_story" USING btree ("story_type");--> statement-breakpoint
CREATE INDEX "idx_member_media_family_member_id" ON "member_media" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "idx_member_media_family_tree_id" ON "member_media" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_member_media_uploaded_by" ON "member_media" USING btree ("uploaded_by_user_id");