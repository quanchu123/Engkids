CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  child_age_value INTEGER;
  parent_age_value INTEGER;
BEGIN
  child_age_value := CASE
    WHEN COALESCE(NEW.raw_user_meta_data->>'child_age', '') ~ '^\d+$'
      THEN (NEW.raw_user_meta_data->>'child_age')::INTEGER
    ELSE NULL
  END;

  parent_age_value := CASE
    WHEN COALESCE(NEW.raw_user_meta_data->>'parent_age', '') ~ '^\d+$'
      THEN (NEW.raw_user_meta_data->>'parent_age')::INTEGER
    ELSE NULL
  END;

  INSERT INTO public.user_profiles (
    auth_id,
    email,
    name,
    role,
    parent_name,
    child_age,
    parent_age,
    gender,
    address
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NEW.email
    ),
    'user',
    NULLIF(NEW.raw_user_meta_data->>'parent_name', ''),
    child_age_value,
    parent_age_value,
    NULLIF(NEW.raw_user_meta_data->>'gender', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', '')
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = COALESCE(public.user_profiles.email, EXCLUDED.email),
    name = COALESCE(public.user_profiles.name, EXCLUDED.name),
    role = COALESCE(public.user_profiles.role, EXCLUDED.role),
    parent_name = COALESCE(public.user_profiles.parent_name, EXCLUDED.parent_name),
    child_age = COALESCE(public.user_profiles.child_age, EXCLUDED.child_age),
    parent_age = COALESCE(public.user_profiles.parent_age, EXCLUDED.parent_age),
    gender = COALESCE(public.user_profiles.gender, EXCLUDED.gender),
    address = COALESCE(public.user_profiles.address, EXCLUDED.address),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
