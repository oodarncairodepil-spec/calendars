-- Migration: Add months_per_page column to projects table
-- Created: 2025-01-23
-- Description: Adds months_per_page column to support 1 or 2 months per page display

-- Add months_per_page column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS months_per_page INTEGER DEFAULT 1 CHECK (months_per_page IN (1, 2));

-- Update existing projects to have default value of 1
UPDATE projects 
SET months_per_page = 1 
WHERE months_per_page IS NULL;

