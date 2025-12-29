-- Migration: Create holidays table for managing Indonesian holidays
-- Created: 2025-01-23
-- Description: Creates a table to store holidays (both national holidays and joint leave days)

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: holidays
-- Stores holidays with date, name, type (national/joint_leave), and optional emoji
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('national', 'joint_leave')),
  emoji TEXT,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, type) -- Prevent duplicate holidays on same date and type
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_date_type ON holidays(date, type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_holidays_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for holidays"
  ON holidays
  FOR SELECT
  TO public
  USING (true);

-- Create policy for public insert access
CREATE POLICY "Public insert access for holidays"
  ON holidays
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for public update access
CREATE POLICY "Public update access for holidays"
  ON holidays
  FOR UPDATE
  TO public
  USING (true);

-- Create policy for public delete access
CREATE POLICY "Public delete access for holidays"
  ON holidays
  FOR DELETE
  TO public
  USING (true);

-- Insert national holidays for 2026
INSERT INTO holidays (date, name, type, emoji, year) VALUES
  ('2026-01-01', 'Tahun Baru Masehi', 'national', '🎉', 2026),
  ('2026-01-16', 'Isra Mi''raj Nabi Muhammad S.A.W.', 'national', '🕌', 2026),
  ('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili', 'national', '🐉', 2026),
  ('2026-03-19', 'Hari Suci Nyepi (Tahun Baru Saka 1948)', 'national', '🌸', 2026),
  ('2026-03-21', 'Idul Fitri 1447 H', 'national', '🌙', 2026),
  ('2026-03-22', 'Idul Fitri 1447 H', 'national', '🌙', 2026),
  ('2026-04-03', 'Wafat Yesus Kristus', 'national', '✝️', 2026),
  ('2026-04-05', 'Kebangkitan Yesus Kristus (Paskah)', 'national', '🐣', 2026),
  ('2026-05-01', 'Hari Buruh Internasional', 'national', '💼', 2026),
  ('2026-05-14', 'Kenaikan Yesus Kristus', 'national', '✨', 2026),
  ('2026-05-27', 'Idul Adha 1447 H', 'national', '🐑', 2026),
  ('2026-05-31', 'Hari Raya Waisak 2570 BE', 'national', '🕉️', 2026),
  ('2026-06-01', 'Hari Lahir Pancasila', 'national', '📜', 2026),
  ('2026-06-16', '1 Muharam Tahun Baru Islam 1448 H', 'national', '🕌', 2026),
  ('2026-08-17', 'Proklamasi Kemerdekaan', 'national', '🇮🇩', 2026),
  ('2026-08-25', 'Maulid Nabi Muhammad S.A.W.', 'national', '🎊', 2026),
  ('2026-12-25', 'Kelahiran Yesus Kristus (Natal)', 'national', '🎄', 2026)
ON CONFLICT (date, type) DO NOTHING;

-- Insert joint leave days (cuti bersama) for 2026
INSERT INTO holidays (date, name, type, emoji, year) VALUES
  ('2026-02-16', 'Tahun Baru Imlek 2577 Kongzili', 'joint_leave', '🐉', 2026),
  ('2026-03-18', 'Hari Suci Nyepi (Tahun Baru Saka 1948)', 'joint_leave', '🌸', 2026),
  ('2026-03-20', 'Idul Fitri 1447 H', 'joint_leave', '🌙', 2026),
  ('2026-03-23', 'Idul Fitri 1447 H', 'joint_leave', '🌙', 2026),
  ('2026-03-24', 'Idul Fitri 1447 H', 'joint_leave', '🌙', 2026),
  ('2026-05-15', 'Kenaikan Yesus Kristus', 'joint_leave', '✨', 2026),
  ('2026-05-28', 'Idul Adha 1447 H', 'joint_leave', '🐑', 2026),
  ('2026-12-24', 'Kelahiran Yesus Kristus', 'joint_leave', '🎄', 2026)
ON CONFLICT (date, type) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE holidays IS 'Stores Indonesian national holidays and joint leave days (cuti bersama)';
COMMENT ON COLUMN holidays.type IS 'Type of holiday: national (Hari Libur Nasional) or joint_leave (Cuti Bersama)';
COMMENT ON COLUMN holidays.year IS 'Year of the holiday for easier filtering';

