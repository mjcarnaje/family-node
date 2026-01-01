-- Add cover image URL to family_tree table
ALTER TABLE "family_tree" ADD COLUMN IF NOT EXISTS "cover_image_url" text;
