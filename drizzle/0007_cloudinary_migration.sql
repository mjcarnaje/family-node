-- Migration: Cloudinary Storage
-- Replace R2 file_key with Cloudinary public_id and url

-- Create attachment_type enum for post attachments
DO $$ BEGIN
    CREATE TYPE "attachment_type" AS ENUM ('image', 'video');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update member_media table: Replace file_key with public_id and url
ALTER TABLE "member_media" ADD COLUMN IF NOT EXISTS "public_id" text;
ALTER TABLE "member_media" ADD COLUMN IF NOT EXISTS "url" text;

-- Migrate existing data: Use file_key as public_id and construct URL
UPDATE "member_media"
SET "public_id" = "file_key",
    "url" = "file_key"
WHERE "public_id" IS NULL OR "url" IS NULL;

-- Make columns NOT NULL after migration
ALTER TABLE "member_media" ALTER COLUMN "public_id" SET NOT NULL;
ALTER TABLE "member_media" ALTER COLUMN "url" SET NOT NULL;

-- Drop the old file_key column
ALTER TABLE "member_media" DROP COLUMN IF EXISTS "file_key";

-- Create post_attachment table for posts and comments media
CREATE TABLE IF NOT EXISTS "post_attachment" (
    "id" text PRIMARY KEY NOT NULL,
    "post_id" text,
    "comment_id" text,
    "type" "attachment_type" NOT NULL,
    "public_id" text NOT NULL,
    "url" text NOT NULL,
    "file_name" text NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for post_attachment
CREATE INDEX IF NOT EXISTS "idx_post_attachment_post_id" ON "post_attachment" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_attachment_comment_id" ON "post_attachment" ("comment_id");
