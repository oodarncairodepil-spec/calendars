-- Migration: Add page margins support
-- Created: 2025-01-23
-- Description: Adds support for page margins (top, right, bottom, left) for cover and month pages
-- Note: This is a documentation-only migration. The margins are stored as part of the MonthPage JSONB
-- structure in the months column. No schema changes are required as the months column is JSONB
-- and can store the margins field dynamically.

-- The margins field is optional in MonthPage interface:
-- margins?: { top: number; right: number; bottom: number; left: number; }
--
-- Default margins: 10mm for all sides (top, right, bottom, left)
--
-- Cover pages and month pages can have different margins:
-- - Cover page margins are independent
-- - Month page margins are shared across all month pages (when updated, all month pages use the same margins)

-- No SQL changes needed - margins are stored in the JSONB months column automatically

COMMENT ON COLUMN projects.months IS 'Array of MonthPage objects. Each MonthPage can optionally have a margins field: { top: number, right: number, bottom: number, left: number }';

