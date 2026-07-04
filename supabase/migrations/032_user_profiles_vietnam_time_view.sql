DROP VIEW IF EXISTS public.user_profiles_vn_time;

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
