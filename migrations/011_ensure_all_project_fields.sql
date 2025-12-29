-- Migration: Ensure all project details are properly saved
-- Created: 2025-01-24
-- Description: Verifies and ensures all project detail fields exist for proper saving:
--   1. Project settings (title, calendar_type, format, orientation, bleed, margin, months_per_page, font_family, cover_image_fit, months_image_fit)
--   2. Cover page text (stored in months JSONB: coverTextTop, coverTextBottom)
--   3. Page margins (stored in months JSONB: margins {top, right, bottom, left})
--   4. Frame selection (stored in months JSONB: layout.imageFrame, layout.calendarGridFrame)
--   5. Signature (signature_image_url, signature_position, signature_size)

-- Ensure months_per_page column exists (from migration 003)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS months_per_page INTEGER DEFAULT 1 CHECK (months_per_page IN (1, 2));

-- Ensure selected_group_id column exists (from migration 004)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS selected_group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Ensure font_family column exists (from migration 005)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';

-- Ensure cover_image_fit column exists (from migration 008)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS cover_image_fit TEXT DEFAULT 'cover' CHECK (cover_image_fit IN ('cover', 'contain', 'stretch'));

-- Ensure months_image_fit column exists (from migration 008)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS months_image_fit TEXT DEFAULT 'cover' CHECK (months_image_fit IN ('cover', 'contain', 'stretch'));

-- Ensure signature_image_url column exists (from migration 009)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS signature_image_url TEXT DEFAULT NULL;

-- Ensure signature_position column exists (from migration 009)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS signature_position JSONB DEFAULT NULL;

-- Ensure signature_size column exists (from migration 009)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS signature_size JSONB DEFAULT NULL;

-- Update existing projects with defaults if NULL
UPDATE projects
SET months_per_page = 1
WHERE months_per_page IS NULL;

UPDATE projects
SET font_family = 'Inter'
WHERE font_family IS NULL;

UPDATE projects
SET cover_image_fit = 'cover'
WHERE cover_image_fit IS NULL;

UPDATE projects
SET months_image_fit = 'cover'
WHERE months_image_fit IS NULL;

-- Create indexes for better query performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_projects_months_per_page ON projects(months_per_page);
CREATE INDEX IF NOT EXISTS idx_projects_selected_group_id ON projects(selected_group_id);
CREATE INDEX IF NOT EXISTS idx_projects_font_family ON projects(font_family);

-- Add comprehensive comments for documentation
COMMENT ON COLUMN projects.title IS 'Project title/name';
COMMENT ON COLUMN projects.calendar_type IS 'Type of calendar: wall or desk';
COMMENT ON COLUMN projects.format IS 'Page format as JSONB: { width: number, height: number, unit: "mm" | "px" }';
COMMENT ON COLUMN projects.orientation IS 'Page orientation: portrait or landscape';
COMMENT ON COLUMN projects.bleed IS 'Bleed size in mm';
COMMENT ON COLUMN projects.margin IS 'Default margin size in mm';
COMMENT ON COLUMN projects.months IS 'Array of MonthPage objects (JSONB). Each MonthPage contains:
  - month: number (1-12) or "cover"
  - layout: { imageFrame: {x, y, w, h}, calendarGridFrame: {x, y, w, h} }
  - assignedImageId: string | null
  - imageTransform: {x, y, scale, rotation, crop: {x, y, w, h}}
  - showGrid: boolean
  - gridStyle: {typographyScale, weekdayStart, language, showWeekNumbers}
  - coverTextTop?: string (text for top section of cover page)
  - coverTextBottom?: string (text for bottom section of cover page)
  - margins?: {top: number, right: number, bottom: number, left: number} (page margins)';
COMMENT ON COLUMN projects.months_per_page IS 'Number of months to display per page: 1 or 2';
COMMENT ON COLUMN projects.selected_group_id IS 'Selected group ID for ImagePanel in editor';
COMMENT ON COLUMN projects.font_family IS 'Font family for the calendar (e.g., Inter, Sora, Roboto, etc.)';
COMMENT ON COLUMN projects.cover_image_fit IS 'Image fit mode for the cover page: cover (fill frame), contain (fit inside), or stretch';
COMMENT ON COLUMN projects.months_image_fit IS 'Image fit mode for all month pages: cover (fill frame), contain (fit inside), or stretch';
COMMENT ON COLUMN projects.signature_image_url IS 'URL of the signature image to display on all pages';
COMMENT ON COLUMN projects.signature_position IS 'Position of signature as normalized coordinates {x: 0-1, y: 0-1} where 0,0 is top-left and 1,1 is bottom-right';
COMMENT ON COLUMN projects.signature_size IS 'Size of signature as percentage of page {width: 0-1, height: 0-1}';

-- Verify the months column can store all required data
-- Note: The months JSONB column stores all page-level data including:
--   - Cover page text: coverTextTop, coverTextBottom (in MonthPage for month="cover")
--   - Page margins: margins {top, right, bottom, left} (optional in MonthPage)
--   - Frame selection: layout.imageFrame, layout.calendarGridFrame (required in MonthPage)
--   - Image assignments, transforms, and grid settings
-- All of this data is saved when the project.months array is saved as JSONB.

