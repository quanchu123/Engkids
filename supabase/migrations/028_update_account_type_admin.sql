-- ============================================
-- UPDATE ACCOUNT TYPE FOR ADMINS
-- ============================================

-- The user_profiles table has a check constraint on account_type
-- Let's drop it so we can add 'admin'
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_account_type_check;

-- Change existing 'premium' accounts to 'admin' (since they were created by create-admin.js)
UPDATE public.user_profiles
SET account_type = 'admin'
WHERE account_type = 'premium';

-- Re-add the check constraint with 'admin' included
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_account_type_check 
CHECK (account_type IN ('free', 'premium', 'trial', 'admin'));
