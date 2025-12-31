CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."marriage_status" AS ENUM('married', 'divorced', 'widowed', 'separated', 'annulled');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('biological', 'adopted', 'step', 'foster');--> statement-breakpoint
CREATE TABLE "family_member" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"nickname" text,
	"gender" "gender",
	"birth_date" date,
	"birth_place" text,
	"death_date" date,
	"death_place" text,
	"bio" text,
	"profile_image_url" text,
	"linked_user_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_tree" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"is_public" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marriage_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"spouse1_id" text NOT NULL,
	"spouse2_id" text NOT NULL,
	"marriage_date" date,
	"marriage_place" text,
	"divorce_date" date,
	"status" "marriage_status" NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_child_relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"family_tree_id" text NOT NULL,
	"parent_id" text NOT NULL,
	"child_id" text NOT NULL,
	"relationship_type" "relationship_type" NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_linked_user_id_user_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_tree" ADD CONSTRAINT "family_tree_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriage_connection" ADD CONSTRAINT "marriage_connection_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriage_connection" ADD CONSTRAINT "marriage_connection_spouse1_id_family_member_id_fk" FOREIGN KEY ("spouse1_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriage_connection" ADD CONSTRAINT "marriage_connection_spouse2_id_family_member_id_fk" FOREIGN KEY ("spouse2_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_relationship" ADD CONSTRAINT "parent_child_relationship_family_tree_id_family_tree_id_fk" FOREIGN KEY ("family_tree_id") REFERENCES "public"."family_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_relationship" ADD CONSTRAINT "parent_child_relationship_parent_id_family_member_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_relationship" ADD CONSTRAINT "parent_child_relationship_child_id_family_member_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_family_member_family_tree_id" ON "family_member" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_family_member_linked_user_id" ON "family_member" USING btree ("linked_user_id");--> statement-breakpoint
CREATE INDEX "idx_family_member_last_name" ON "family_member" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "idx_family_tree_owner_id" ON "family_tree" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_family_tree_is_public" ON "family_tree" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_marriage_family_tree_id" ON "marriage_connection" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_marriage_spouse1_id" ON "marriage_connection" USING btree ("spouse1_id");--> statement-breakpoint
CREATE INDEX "idx_marriage_spouse2_id" ON "marriage_connection" USING btree ("spouse2_id");--> statement-breakpoint
CREATE INDEX "idx_parent_child_family_tree_id" ON "parent_child_relationship" USING btree ("family_tree_id");--> statement-breakpoint
CREATE INDEX "idx_parent_child_parent_id" ON "parent_child_relationship" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_parent_child_child_id" ON "parent_child_relationship" USING btree ("child_id");