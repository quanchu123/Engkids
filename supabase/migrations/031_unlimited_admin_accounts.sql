-- Give every admin account the same unlimited entitlement as viet@ultra.com.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

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

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_account_type_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_account_type_check
CHECK (account_type IN ('free', 'premium', 'trial', 'admin'));

WITH admin_emails AS (
  SELECT lower(email) AS email, role
  FROM public.admin_users
  WHERE COALESCE(is_active, true) = true
),
admin_auth_users AS (
  SELECT u.id, lower(u.email) AS email
  FROM auth.users u
  LEFT JOIN admin_emails ae ON ae.email = lower(u.email)
  WHERE ae.email IS NOT NULL
     OR u.raw_app_meta_data->>'role' IN ('admin', 'super_admin', 'god')
     OR u.raw_app_meta_data->>'admin_role' IN ('admin', 'super_admin', 'god')
)
UPDATE public.user_profiles up
SET
  role = CASE
    WHEN up.role = 'god' THEN 'god'
    WHEN up.role IN ('admin', 'super_admin') THEN up.role
    WHEN ae.role IN ('admin', 'super_admin') THEN ae.role
    ELSE 'admin'
  END,
  account_type = 'admin',
  is_premium = true,
  premium_until = '9999-12-31T23:59:59Z'
FROM admin_auth_users au
LEFT JOIN admin_emails ae ON ae.email = au.email
WHERE up.auth_id = au.id
   OR lower(up.email) = au.email
   OR up.role IN ('admin', 'super_admin', 'god');

UPDATE public.user_profiles up
SET
  role = CASE
    WHEN up.role = 'god' THEN 'god'
    WHEN up.role IN ('admin', 'super_admin') THEN up.role
    WHEN ae.role IN ('admin', 'super_admin') THEN ae.role
    ELSE 'admin'
  END,
  account_type = 'admin',
  is_premium = true,
  premium_until = '9999-12-31T23:59:59Z'
FROM admin_emails ae
WHERE lower(up.email) = ae.email;

UPDATE public.user_profiles
SET
  account_type = 'admin',
  is_premium = true,
  premium_until = '9999-12-31T23:59:59Z'
WHERE role IN ('admin', 'super_admin', 'god');

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'role',
    CASE
      WHEN u.raw_app_meta_data->>'role' IN ('admin', 'super_admin', 'god') THEN u.raw_app_meta_data->>'role'
      WHEN ae.role IN ('admin', 'super_admin') THEN ae.role
      ELSE 'admin'
    END,
    'admin_role',
    CASE
      WHEN u.raw_app_meta_data->>'admin_role' IN ('admin', 'super_admin', 'god') THEN u.raw_app_meta_data->>'admin_role'
      WHEN ae.role = 'super_admin' THEN 'super_admin'
      ELSE 'admin'
    END,
    'account_type', 'admin',
    'premium_until', '9999-12-31T23:59:59Z'
  )
FROM public.admin_users ae
WHERE COALESCE(ae.is_active, true) = true
  AND lower(u.email) = lower(ae.email);

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'account_type', 'admin',
    'premium_until', '9999-12-31T23:59:59Z'
  )
WHERE u.raw_app_meta_data->>'role' IN ('admin', 'super_admin', 'god')
   OR u.raw_app_meta_data->>'admin_role' IN ('admin', 'super_admin', 'god');
