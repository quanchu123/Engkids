-- ============================================
-- GOD ADMIN PROFILE ROLE
-- ============================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

UPDATE public.user_profiles
SET role = 'user'
WHERE role IS NULL;

ALTER TABLE public.user_profiles
ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('user', 'admin', 'super_admin', 'god'));

UPDATE public.user_profiles
SET
  role = 'god',
  account_type = 'premium',
  is_premium = true,
  premium_until = '9999-12-31T23:59:59Z',
  name = 'God of the web',
  email = 'viet@ultra.com'
WHERE lower(email) = 'viet@ultra.com'
   OR auth_id IN (
     SELECT id
     FROM auth.users
     WHERE lower(email) = 'viet@ultra.com'
   );

UPDATE public.admin_users
SET
  role = 'super_admin',
  is_active = true,
  name = 'God of the web'
WHERE lower(email) = 'viet@ultra.com';

UPDATE auth.users
SET
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'name', 'God of the web',
      'display_name', 'God of the web',
      'god_label', true
    ),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'role', 'god',
      'admin_role', 'super_admin',
      'account_type', 'premium',
      'premium_until', '9999-12-31T23:59:59Z'
    )
WHERE lower(email) = 'viet@ultra.com';
