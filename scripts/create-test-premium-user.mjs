import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const email = process.argv[2] || process.env.TEST_USER_EMAIL;
const password = process.argv[3] || process.env.TEST_USER_PASSWORD;
const displayName = process.env.TEST_USER_NAME || 'Test Premium';
const premiumUntil = process.env.TEST_USER_PREMIUM_UNTIL || '9999-12-31T23:59:59Z';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!email || !password) {
  console.error('Usage: node scripts/create-test-premium-user.mjs <email> <password>');
  console.error('Or set TEST_USER_EMAIL and TEST_USER_PASSWORD.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anon = anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

async function findUserByEmail(targetEmail) {
  const lower = targetEmail.toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const found = data.users.find((user) => (user.email || '').toLowerCase() === lower);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }

  return null;
}

async function ensureAuthUser() {
  let user = await findUserByEmail(email);

  const metadata = {
    name: displayName,
    display_name: displayName,
  };
  const appMetadata = {
    account_type: 'premium',
    premium_until: premiumUntil,
  };

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata || {}),
        ...metadata,
      },
      app_metadata: {
        ...(user.app_metadata || {}),
        ...appMetadata,
      },
    });

    if (error) throw error;
    console.log(`Auth user updated: ${data.user.email} (${data.user.id})`);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
    app_metadata: appMetadata,
  });

  if (error) throw error;
  console.log(`Auth user created: ${data.user.email} (${data.user.id})`);
  return data.user;
}

async function ensureProfile(user) {
  const profilePayload = {
    auth_id: user.id,
    email: user.email || email,
    name: displayName,
    account_type: 'premium',
    role: 'user',
    is_premium: true,
    premium_until: premiumUntil,
  };

  const { data, error } = await admin
    .from('user_profiles')
    .upsert(profilePayload, { onConflict: 'auth_id' })
    .select('id, auth_id, email, name, account_type, role, is_premium, premium_until')
    .single();

  if (error) throw error;

  console.log('Profile premium set:', {
    email: data.email,
    account_type: data.account_type,
    role: data.role,
    is_premium: data.is_premium,
    premium_until: data.premium_until,
  });

  const { error: progressError } = await admin
    .from('user_progress')
    .upsert(
      {
        user_profile_id: data.id,
        total_stars: 0,
        current_streak: 0,
      },
      { onConflict: 'user_profile_id' },
    );

  if (progressError) {
    console.log(`Progress row skipped: ${progressError.message}`);
  } else {
    console.log('Progress row ensured');
  }

  return data;
}

async function verifyLogin() {
  if (!anon) {
    console.log('Login verification skipped: NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
    return;
  }

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('email, account_type, role, is_premium, premium_until')
    .eq('auth_id', data.user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const premiumActive =
    !!profile?.premium_until &&
    new Date(profile.premium_until).getTime() > Date.now() &&
    (profile.is_premium === true || profile.account_type === 'premium' || profile.account_type === 'admin');

  console.log(`Login verified: ${data.user.email} (${data.user.id})`);
  console.log(`Premium active: ${premiumActive}`);

  await anon.auth.signOut();
}

try {
  const user = await ensureAuthUser();
  await ensureProfile(user);
  await verifyLogin();
  console.log('Done.');
} catch (error) {
  console.error('Failed:', error.message || error);
  process.exit(1);
}
