-- Migration: Initial Schema for Calendar Maker Application
-- Created: 2025-01-23
-- Description: Creates tables for projects, assets, and groups

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: projects
-- Stores calendar projects with their configuration and month pages
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('wall', 'desk')),
  format JSONB NOT NULL, -- { width: number, height: number, unit: 'mm' | 'px' }
  orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
  bleed NUMERIC NOT NULL DEFAULT 3,
  margin NUMERIC NOT NULL DEFAULT 10,
  months JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of MonthPage objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: assets
-- Stores image assets with metadata
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_width INTEGER NOT NULL,
  original_height INTEGER NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: groups
-- Stores image groups/collections
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT,
  image_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table: asset_groups
-- Many-to-many relationship between assets and groups
CREATE TABLE IF NOT EXISTS asset_groups (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, group_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_source_type ON assets(source_type);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_groups_asset_id ON asset_groups(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_groups_group_id ON asset_groups(group_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (using anon key)
-- Note: Adjust these policies based on your authentication requirements

-- Projects policies
CREATE POLICY "Allow public read access on projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on projects"
  ON projects FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on projects"
  ON projects FOR DELETE
  USING (true);

-- Assets policies
CREATE POLICY "Allow public read access on assets"
  ON assets FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on assets"
  ON assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on assets"
  ON assets FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on assets"
  ON assets FOR DELETE
  USING (true);

-- Groups policies
CREATE POLICY "Allow public read access on groups"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on groups"
  ON groups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on groups"
  ON groups FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on groups"
  ON groups FOR DELETE
  USING (true);

-- Asset groups policies
CREATE POLICY "Allow public read access on asset_groups"
  ON asset_groups FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on asset_groups"
  ON asset_groups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete on asset_groups"
  ON asset_groups FOR DELETE
  USING (true);

