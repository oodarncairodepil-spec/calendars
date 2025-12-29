-- Migration: Add image fit modes for cover and months pages
-- Created: 2025-01-23
-- Description: Adds columns to store image fit mode settings separately for cover page and months pages.

-- Add cover_image_fit column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS cover_image_fit TEXT DEFAULT 'cover' CHECK (cover_image_fit IN ('cover', 'contain', 'stretch'));

-- Add months_image_fit column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS months_image_fit TEXT DEFAULT 'cover' CHECK (months_image_fit IN ('cover', 'contain', 'stretch'));

-- Add comments for documentation
COMMENT ON COLUMN projects.cover_image_fit IS 'Image fit mode for the cover page: cover (fill frame), contain (fit inside), or stretch';
COMMENT ON COLUMN projects.months_image_fit IS 'Image fit mode for all month pages: cover (fill frame), contain (fit inside), or stretch';

