-- Full-Text Search Migration for Family Tree Members
-- This migration adds PostgreSQL full-text search capabilities for efficient searching
-- across member names, dates, descriptions, and other searchable content.

-- Create a tsvector column on family_member table for full-text search
ALTER TABLE "family_member" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index on the search_vector column for fast full-text search
CREATE INDEX IF NOT EXISTS "idx_family_member_search_vector" ON "family_member" USING GIN ("search_vector");

-- Create a function to generate the search vector from member data
CREATE OR REPLACE FUNCTION update_family_member_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.middle_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.nickname, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.birth_place, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.death_place, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS "family_member_search_vector_update" ON "family_member";
CREATE TRIGGER "family_member_search_vector_update"
  BEFORE INSERT OR UPDATE ON "family_member"
  FOR EACH ROW
  EXECUTE FUNCTION update_family_member_search_vector();

-- Update existing rows to populate the search vector
UPDATE "family_member" SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(middle_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(nickname, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(birth_place, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(death_place, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(bio, '')), 'D');

-- Create a tsvector column on family_member_story table for full-text search
ALTER TABLE "family_member_story" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index on the search_vector column for fast full-text search
CREATE INDEX IF NOT EXISTS "idx_family_member_story_search_vector" ON "family_member_story" USING GIN ("search_vector");

-- Create a function to generate the search vector from story data
CREATE OR REPLACE FUNCTION update_family_member_story_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS "family_member_story_search_vector_update" ON "family_member_story";
CREATE TRIGGER "family_member_story_search_vector_update"
  BEFORE INSERT OR UPDATE ON "family_member_story"
  FOR EACH ROW
  EXECUTE FUNCTION update_family_member_story_search_vector();

-- Update existing rows to populate the search vector
UPDATE "family_member_story" SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B');

-- Create a tsvector column on family_member_event table for full-text search
ALTER TABLE "family_member_event" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index on the search_vector column for fast full-text search
CREATE INDEX IF NOT EXISTS "idx_family_member_event_search_vector" ON "family_member_event" USING GIN ("search_vector");

-- Create a function to generate the search vector from event data
CREATE OR REPLACE FUNCTION update_family_member_event_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS "family_member_event_search_vector_update" ON "family_member_event";
CREATE TRIGGER "family_member_event_search_vector_update"
  BEFORE INSERT OR UPDATE ON "family_member_event"
  FOR EACH ROW
  EXECUTE FUNCTION update_family_member_event_search_vector();

-- Update existing rows to populate the search vector
UPDATE "family_member_event" SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'C');

-- Create additional indexes for date-based filtering
CREATE INDEX IF NOT EXISTS "idx_family_member_birth_date" ON "family_member" ("birth_date");
CREATE INDEX IF NOT EXISTS "idx_family_member_death_date" ON "family_member" ("death_date");

-- Create composite index for tree-scoped searches
CREATE INDEX IF NOT EXISTS "idx_family_member_tree_search" ON "family_member" ("family_tree_id", "search_vector") USING GIN ("search_vector");
