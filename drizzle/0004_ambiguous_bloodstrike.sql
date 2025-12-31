CREATE TYPE "public"."collaboration_session_status" AS ENUM('active', 'idle', 'editing', 'disconnected');--> statement-breakpoint
CREATE TABLE "collaboration_session" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "collaboration_session_status" NOT NULL,
	"cursor_x" integer,
	"cursor_y" integer,
	"viewport_zoom" integer,
	"editing_entity_id" text,
	"editing_entity_type" "tree_entity_type",
	"last_heartbeat" timestamp NOT NULL,
	"connected_at" timestamp NOT NULL,
	"disconnected_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "edit_lock" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" "tree_entity_type" NOT NULL,
	"locked_by_user_id" text NOT NULL,
	"locked_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"user_id" text NOT NULL,
	"activity_type" "tree_change_type" NOT NULL,
	"entity_type" "tree_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collaboration_session" ADD CONSTRAINT "collaboration_session_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_session" ADD CONSTRAINT "collaboration_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_lock" ADD CONSTRAINT "edit_lock_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_lock" ADD CONSTRAINT "edit_lock_locked_by_user_id_user_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_activity" ADD CONSTRAINT "tree_activity_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_activity" ADD CONSTRAINT "tree_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collaboration_session_family_tree_id" ON "collaboration_session" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_collaboration_session_user_id" ON "collaboration_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_collaboration_session_status" ON "collaboration_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_collaboration_session_last_heartbeat" ON "collaboration_session" USING btree ("last_heartbeat");--> statement-breakpoint
CREATE INDEX "idx_edit_lock_family_tree_id" ON "edit_lock" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_edit_lock_entity" ON "edit_lock" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_edit_lock_locked_by" ON "edit_lock" USING btree ("locked_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_edit_lock_expires_at" ON "edit_lock" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_tree_activity_family_tree_id" ON "tree_activity" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_tree_activity_user_id" ON "tree_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tree_activity_created_at" ON "tree_activity" USING btree ("created_at");