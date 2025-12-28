-- Migration: Add font_family column to projects table
-- Created: 2025-01-23
-- Description: Adds font_family column to store the selected font for calendar project

-- Add font_family column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';

-- Create index for better query performance (optional, but useful if filtering by font)
CREATE INDEX IF NOT EXISTS idx_projects_font_family ON projects(font_family);

-- Add comment to column
COMMENT ON COLUMN projects.font_family IS 'Font family for the calendar (e.g., Inter, Sora, Roboto, etc.)';

-- Update existing projects to have default font
UPDATE projects
SET font_family = 'Inter'
WHERE font_family IS NULL;

