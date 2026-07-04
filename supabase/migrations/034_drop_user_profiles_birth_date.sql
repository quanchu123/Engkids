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

DROP VIEW IF EXISTS public.user_profiles_vn_time;

ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS birth_date;

CREATE VIEW public.user_profiles_vn_time AS
SELECT
  to_char(timezone('Asia/Ho_Chi_Minh', up.created_at), 'DD/MM/YYYY HH24:MI:SS') AS created_at_vn_text,
  to_char(timezone('Asia/Ho_Chi_Minh', up.updated_at), 'DD/MM/YYYY HH24:MI:SS') AS updated_at_vn_text,
  timezone('Asia/Ho_Chi_Minh', up.created_at) AS created_at_vn,
  timezone('Asia/Ho_Chi_Minh', up.updated_at) AS updated_at_vn,
  up.id,
  up.auth_id,
  up.device_id,
  up.email,
  up.name,
  up.parent_name,
  up.gender,
  up.address,
  up.child_age,
  up.parent_age,
  up.avatar_url,
  up.account_type,
  up.is_premium,
  up.premium_until,
  up.role,
  up.created_at AS created_at_utc,
  up.updated_at AS updated_at_utc
FROM public.user_profiles up;

COMMENT ON VIEW public.user_profiles_vn_time IS
  'Read-only convenience view for Supabase Table Editor. Converts user profile timestamps to Vietnam time without changing UTC timestamptz source columns.';
