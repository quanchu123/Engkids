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
  paid_at?: string | null;
  premium_applied_at?: string | null;
  premium_until_after?: string | null;
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

function hasPremiumTrackingColumns(transaction: TransactionRow): boolean {
  return (
    Object.prototype.hasOwnProperty.call(transaction, 'premium_applied_at') ||
    Object.prototype.hasOwnProperty.call(transaction, 'premium_until_after')
  );
}

function isMissingColumnError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string } | null;
  return candidate?.code === '42703' || /column .* does not exist/i.test(candidate?.message ?? '');
}

async function updateTransactionPaid(
  supabaseAdmin: SupabaseClient,
  transaction: TransactionRow,
  now: string,
  premiumUntil: string,
): Promise<void> {
  const shouldMarkPaid = transaction.status !== 'PAID';
  const shouldTrackPremium = hasPremiumTrackingColumns(transaction);

  const basePayload = shouldMarkPaid
    ? {
        status: 'PAID',
        paid_at: transaction.paid_at ?? now,
      }
    : {};

  const trackingPayload = shouldTrackPremium
    ? {
        premium_applied_at: now,
        premium_until_after: premiumUntil,
      }
    : {};

  const payload = { ...basePayload, ...trackingPayload };
  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await supabaseAdmin
    .from('transactions')
    .update(payload)
    .eq('id', transaction.id);

  if (!error) {
    return;
  }

  if (shouldTrackPremium && isMissingColumnError(error)) {
    const { error: fallbackError } = await supabaseAdmin
      .from('transactions')
      .update(basePayload)
      .eq('id', transaction.id);

    if (fallbackError) throw fallbackError;
    return;
  }

  throw error;
}

export async function markTransactionPaidAndUpgrade(
  supabaseAdmin: SupabaseClient,
  transaction: TransactionRow,
): Promise<string | null> {
  const now = new Date().toISOString();

  if (transaction.premium_applied_at) {
    return null;
  }

  if (transaction.status === 'PAID' && !hasPremiumTrackingColumns(transaction)) {
    return null;
  }

  const premiumUntil = await applyPremiumUpgrade(supabaseAdmin, transaction.user_id, transaction.plan_id);
  if (!premiumUntil) return null;

  await updateTransactionPaid(supabaseAdmin, transaction, now, premiumUntil);
  return premiumUntil;
}
