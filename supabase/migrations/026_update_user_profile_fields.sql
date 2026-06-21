-- ============================================
-- UPDATE CUSTOM REGISTRATION FIELDS IN user_profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new age columns
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS child_age INTEGER,
ADD COLUMN IF NOT EXISTS parent_age INTEGER;

-- Update the handle_new_user trigger to save child_age and parent_age
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_id, email, name, role, parent_name, child_age, parent_age, gender, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user',
    NEW.raw_user_meta_data->>'parent_name',
    NULLIF(NEW.raw_user_meta_data->>'child_age', '')::INTEGER,
    NULLIF(NEW.raw_user_meta_data->>'parent_age', '')::INTEGER,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'address'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
