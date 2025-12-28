-- Migration: Add selected_group_id column to projects table
-- Created: 2025-01-23
-- Description: Adds selected_group_id column to store the selected group for ImagePanel per project

-- Add selected_group_id column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS selected_group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_selected_group_id ON projects(selected_group_id);

-- Add comment to column
COMMENT ON COLUMN projects.selected_group_id IS 'Selected group ID for ImagePanel in editor';

