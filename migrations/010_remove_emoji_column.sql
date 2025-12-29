-- Migration: Remove emoji column from holidays table
-- Created: 2025-01-23
-- Description: Removes the emoji column from the holidays table as emojis are no longer used in the application.

-- Drop the emoji column from holidays table
ALTER TABLE holidays
DROP COLUMN IF EXISTS emoji;

-- Add comment to document the change
COMMENT ON TABLE holidays IS 'Stores Indonesian national holidays and joint leave days (cuti bersama). Emoji column has been removed.';

