-- Migration: Add signature fields for calendar projects
-- Created: 2025-01-23
-- Description: Adds columns to store signature image, position, and size settings for all pages.

-- Add signature_image_url column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS signature_image_url TEXT DEFAULT NULL;

-- Add signature_position column to projects table (JSONB to store {x, y})
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS signature_position JSONB DEFAULT NULL;

-- Add signature_size column to projects table (JSONB to store {width, height})
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS signature_size JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN projects.signature_image_url IS 'URL of the signature image to display on all pages';
COMMENT ON COLUMN projects.signature_position IS 'Position of signature as normalized coordinates {x: 0-1, y: 0-1} where 0,0 is top-left and 1,1 is bottom-right';
COMMENT ON COLUMN projects.signature_size IS 'Size of signature as percentage of page {width: 0-1, height: 0-1}';

