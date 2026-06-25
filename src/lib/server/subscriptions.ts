import type { SupabaseClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_PLANS, PlanId } from '@/lib/payment';

interface UserProfileRow {
  auth_id: string;
  email: string | null;
  name: string | null;
  premium_until: string | null;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  premium_applied_at?: string | null;
}

function addPlanDuration(from: Date, planId: PlanId): Date {
  const plan = SUBSCRIPTION_PLANS[planId];
  const premiumUntil = new Date(from);
  premiumUntil.setMonth(premiumUntil.getMonth() + plan.durationMonths);
  return premiumUntil;
}

export async function applyPremiumUpgrade(
  supabaseAdmin: SupabaseClient,
  authUserId: string,
  planId: string,
): Promise<string | null> {
  const plan = SUBSCRIPTION_PLANS[planId as PlanId];
  if (!plan) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('auth_id, email, name, premium_until')
    .eq('auth_id', authUserId)
    .maybeSingle<UserProfileRow>();

  if (profileError) {
    throw profileError;
  }

  let currentExpiry = new Date();
  if (profile?.premium_until && new Date(profile.premium_until) > currentExpiry) {
    currentExpiry = new Date(profile.premium_until);
  }

  const premiumUntil = addPlanDuration(currentExpiry, planId as PlanId).toISOString();
  const premiumPayload = {
    account_type: 'premium',
    is_premium: true,
    premium_until: premiumUntil,
  };

  if (profile) {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update(premiumPayload)
      .eq('auth_id', authUserId);

    if (error) throw error;
    return premiumUntil;
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const email = authUser.user?.email ?? null;
  const name =
    (authUser.user?.user_metadata?.name as string | undefined) ??
    (authUser.user?.user_metadata?.full_name as string | undefined) ??
    email;

  const { error } = await supabaseAdmin.from('user_profiles').insert({
    auth_id: authUserId,
    email,
    name,
    ...premiumPayload,
  });

  if (error) throw error;
  return premiumUntil;
}

export async function markTransactionPaidAndUpgrade(
  supabaseAdmin: SupabaseClient,
  transaction: TransactionRow,
): Promise<string | null> {
  const now = new Date().toISOString();

  if (transaction.premium_applied_at) {
    return null;
  }

  if (transaction.status !== 'PAID') {
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'PAID', paid_at: now })
      .eq('id', transaction.id);

    if (error) throw error;
  }

  const premiumUntil = await applyPremiumUpgrade(supabaseAdmin, transaction.user_id, transaction.plan_id);
  if (!premiumUntil) return null;

  const { error } = await supabaseAdmin
    .from('transactions')
    .update({
      premium_applied_at: now,
      premium_until_after: premiumUntil,
    })
    .eq('id', transaction.id);

  if (error) throw error;
  return premiumUntil;
}
