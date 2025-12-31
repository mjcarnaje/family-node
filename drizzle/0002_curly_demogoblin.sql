CREATE TYPE "public"."tree_change_type" AS ENUM('MEMBER_ADDED', 'MEMBER_UPDATED', 'MEMBER_DELETED', 'RELATIONSHIP_ADDED', 'RELATIONSHIP_UPDATED', 'RELATIONSHIP_DELETED', 'MARRIAGE_ADDED', 'MARRIAGE_UPDATED', 'MARRIAGE_DELETED', 'TREE_UPDATED', 'BULK_IMPORT', 'REVERT');--> statement-breakpoint
CREATE TYPE "public"."tree_collaborator_role" AS ENUM('viewer', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tree_entity_type" AS ENUM('MEMBER', 'RELATIONSHIP', 'MARRIAGE', 'TREE');--> statement-breakpoint
CREATE TYPE "public"."tree_privacy_level" AS ENUM('private', 'family', 'public');--> statement-breakpoint
CREATE TABLE "tree_access_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"invitee_email" text NOT NULL,
	"role" "tree_collaborator_role" NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "tree_access_invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tree_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"version_id" text NOT NULL,
	"change_type" "tree_change_type" NOT NULL,
	"entity_type" "tree_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"description" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_collaborator" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "tree_collaborator_role" NOT NULL,
	"can_view_sensitive_info" boolean NOT NULL,
	"can_view_contact_info" boolean NOT NULL,
	"invited_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_version" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"change_description" text,
	"members_snapshot" jsonb NOT NULL,
	"relationships_snapshot" jsonb NOT NULL,
	"marriages_snapshot" jsonb NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_tree" ADD COLUMN "privacy_level" "tree_privacy_level" NOT NULL;--> statement-breakpoint
ALTER TABLE "tree_access_invitation" ADD CONSTRAINT "tree_access_invitation_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_access_invitation" ADD CONSTRAINT "tree_access_invitation_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_change_log" ADD CONSTRAINT "tree_change_log_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_change_log" ADD CONSTRAINT "tree_change_log_version_id_tree_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tree_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_change_log" ADD CONSTRAINT "tree_change_log_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_collaborator" ADD CONSTRAINT "tree_collaborator_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_collaborator" ADD CONSTRAINT "tree_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_version" ADD CONSTRAINT "tree_version_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_version" ADD CONSTRAINT "tree_version_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tree_access_invitation_family_tree_id" ON "tree_access_invitation" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_tree_access_invitation_invitee_email" ON "tree_access_invitation" USING btree ("invitee_email");--> statement-breakpoint
CREATE INDEX "idx_tree_access_invitation_token" ON "tree_access_invitation" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_tree_access_invitation_invited_by_user_id" ON "tree_access_invitation" USING btree ("invited_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_tree_change_log_family_tree_id" ON "tree_change_log" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_tree_change_log_version_id" ON "tree_change_log" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "idx_tree_change_log_created_at" ON "tree_change_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tree_change_log_entity_type" ON "tree_change_log" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_tree_collaborator_family_tree_id" ON "tree_collaborator" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_tree_collaborator_user_id" ON "tree_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tree_version_family_tree_id" ON "tree_version" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_tree_version_created_at" ON "tree_version" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tree_version_version_number" ON "tree_version" USING btree ("version_number");--> statement-breakpoint
CREATE INDEX "idx_family_tree_privacy_level" ON "family_tree" USING btree ("privacy_level");