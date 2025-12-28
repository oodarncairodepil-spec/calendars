-- Migration: Setup Supabase Storage Bucket for Images
-- Created: 2025-01-23
-- Description: Creates storage bucket and policies for image uploads

-- IMPORTANT: 
-- Storage buckets and policies CANNOT be created via SQL Editor with anon key.
-- They must be created manually through the Supabase Dashboard UI.
-- 
-- This file contains reference SQL for documentation purposes only.
-- See 002_setup_storage_bucket_instructions.md for step-by-step instructions.

-- ============================================
-- DO NOT RUN THIS SQL - IT WILL FAIL!
-- Use the Dashboard UI instead (see instructions)
-- ============================================

-- Reference SQL (for documentation only):
-- These are the policies that need to be created via Dashboard UI:

-- Policy 1: SELECT (Read access)
-- Name: "Public read access for images"
-- Operation: SELECT
-- Target roles: public
-- USING expression: bucket_id = 'images'

-- Policy 2: INSERT (Upload access)
-- Name: "Public insert access for images"
-- Operation: INSERT
-- Target roles: public
-- WITH CHECK expression: bucket_id = 'images'

-- Policy 3: UPDATE (Update access)
-- Name: "Public update access for images"
-- Operation: UPDATE
-- Target roles: public
-- USING expression: bucket_id = 'images'
-- WITH CHECK expression: bucket_id = 'images'

-- Policy 4: DELETE (Delete access)
-- Name: "Public delete access for images"
-- Operation: DELETE
-- Target roles: public
-- USING expression: bucket_id = 'images'

