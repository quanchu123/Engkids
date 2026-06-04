-- Fix RLS for stories table
-- Run this in Supabase Dashboard > SQL Editor

-- Option 1: Disable RLS (simple, for dev/testing)
-- ALTER TABLE stories DISABLE ROW LEVEL SECURITY;

-- Option 2: Add policies to allow operations (recommended for production)

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read" ON stories;
DROP POLICY IF EXISTS "Allow authenticated insert" ON stories;
DROP POLICY IF EXISTS "Allow authenticated update" ON stories;
DROP POLICY IF EXISTS "Allow authenticated delete" ON stories;
DROP POLICY IF EXISTS "Allow anon read" ON stories;
DROP POLICY IF EXISTS "Allow anon insert" ON stories;
DROP POLICY IF EXISTS "Allow anon update" ON stories;
DROP POLICY IF EXISTS "Allow anon delete" ON stories;

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read stories
CREATE POLICY "Allow public read" ON stories
  FOR SELECT
  USING (true);

-- Allow anon/authenticated users to insert stories
CREATE POLICY "Allow anon insert" ON stories
  FOR INSERT
  WITH CHECK (true);

-- Allow anon/authenticated users to update stories
CREATE POLICY "Allow anon update" ON stories
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anon/authenticated users to delete stories
CREATE POLICY "Allow anon delete" ON stories
  FOR DELETE
  USING (true);

-- Verify
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'stories';
