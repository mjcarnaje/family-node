CREATE TYPE "public"."genealogy_import_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."genealogy_service" AS ENUM('familysearch', 'ancestry', 'myheritage', 'findmypast', 'gedmatch');--> statement-breakpoint
CREATE TYPE "public"."notification_related_type" AS ENUM('FAMILY_TREE', 'FAMILY_MEMBER', 'RELATIONSHIP', 'MARRIAGE', 'USER');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('TREE_MEMBER_ADDED', 'TREE_MEMBER_UPDATED', 'TREE_MEMBER_DELETED', 'TREE_RELATIONSHIP_ADDED', 'TREE_RELATIONSHIP_UPDATED', 'TREE_RELATIONSHIP_DELETED', 'TREE_MARRIAGE_ADDED', 'TREE_MARRIAGE_UPDATED', 'TREE_MARRIAGE_DELETED', 'TREE_INVITATION', 'TREE_ACCESS_GRANTED', 'GENERAL');--> statement-breakpoint
CREATE TABLE "external_member_reference" (
	"id" text PRIMARY KEY NOT NULL,
	"family_member_id" text NOT NULL,
	"family_tree_id" text NOT NULL,
	"service" "genealogy_service" NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text,
	"external_data" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genealogy_import_session" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"user_id" text NOT NULL,
	"service" "genealogy_service" NOT NULL,
	"status" "genealogy_import_status" NOT NULL,
	"source_tree_id" text,
	"source_tree_name" text,
	"import_relationships" boolean NOT NULL,
	"import_events" boolean NOT NULL,
	"skip_duplicates" boolean NOT NULL,
	"members_imported" integer NOT NULL,
	"relationships_imported" integer NOT NULL,
	"events_imported" integer NOT NULL,
	"duplicates_skipped" integer NOT NULL,
	"errors_count" integer NOT NULL,
	"error_details" jsonb,
	"import_log" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genealogy_service_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"service" "genealogy_service" NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"external_user_id" text,
	"external_username" text,
	"is_active" boolean NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"related_id" text,
	"related_type" "notification_related_type",
	"metadata" jsonb,
	"is_read" boolean NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_member_reference" ADD CONSTRAINT "external_member_reference_family_member_id_family_member_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_member_reference" ADD CONSTRAINT "external_member_reference_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genealogy_import_session" ADD CONSTRAINT "genealogy_import_session_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genealogy_import_session" ADD CONSTRAINT "genealogy_import_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genealogy_service_connection" ADD CONSTRAINT "genealogy_service_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_external_member_family_member_id" ON "external_member_reference" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "idx_external_member_family_tree_id" ON "external_member_reference" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_external_member_service" ON "external_member_reference" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_external_member_external_id" ON "external_member_reference" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_genealogy_import_family_tree_id" ON "genealogy_import_session" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_genealogy_import_user_id" ON "genealogy_import_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_genealogy_import_status" ON "genealogy_import_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_genealogy_import_service" ON "genealogy_import_session" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_genealogy_connection_user_id" ON "genealogy_service_connection" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_genealogy_connection_service" ON "genealogy_service_connection" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_notification_user_id" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_type" ON "notification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notification_is_read" ON "notification" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notification_created_at" ON "notification" USING btree ("created_at");