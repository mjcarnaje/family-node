-- Add public access columns to family_tree table
ALTER TABLE "family_tree" ADD COLUMN IF NOT EXISTS "public_slug" text UNIQUE;
ALTER TABLE "family_tree" ADD COLUMN IF NOT EXISTS "public_pin" text;

-- Create index on public_slug for faster lookups
CREATE INDEX IF NOT EXISTS "family_tree_public_slug_idx" ON "family_tree" ("public_slug");
