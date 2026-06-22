'use client';

import { getSupabaseClient } from '@/lib/auth-client';
import { FREEMIUM_DAILY_MINUTES } from '@/lib/payment';

// ── localStorage keys ───────────────────────────────────────────────────
const USAGE_KEY_PREFIX = 'engkids.freemium.usage_';
const PREMIUM_CACHE_KEY = 'engkids.premium_cache';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Usage tracking (seconds used today) ─────────────────────────────────

/** Get total seconds used today from localStorage. */
export function getUsedSecondsToday(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(USAGE_KEY_PREFIX + todayKey());
  return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
}

/** Increment usage by `delta` seconds. */
export function addUsageSeconds(delta: number): void {
  if (typeof window === 'undefined') return;
  const key = USAGE_KEY_PREFIX + todayKey();
  const current = getUsedSecondsToday();
  localStorage.setItem(key, String(current + Math.max(0, delta)));
}

/** Remaining seconds for today. */
export function getRemainingSeconds(): number {
  const total = FREEMIUM_DAILY_MINUTES * 60;
  return Math.max(0, total - getUsedSecondsToday());
}

/** True when the user has exhausted today's free time. */
export function isFreemiumExpired(): boolean {
  return getRemainingSeconds() <= 0;
}

// ── Premium status ──────────────────────────────────────────────────────

interface PremiumCache {
  isPremium: boolean;
  premiumUntil: string | null;
  cachedAt: number; // epoch ms
}

const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

/** Check if cached premium status is still valid. */
function getCachedPremiumStatus(): PremiumCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREMIUM_CACHE_KEY);
    if (!raw) return null;
    const cache: PremiumCache = JSON.parse(raw);
    if (Date.now() - cache.cachedAt > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

/** Set cached premium status. */
function setCachedPremiumStatus(isPremium: boolean, premiumUntil: string | null): void {
  if (typeof window === 'undefined') return;
  const cache: PremiumCache = { isPremium, premiumUntil, cachedAt: Date.now() };
  localStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(cache));
}

/** Clear the premium cache (call after payment confirmation). */
export function clearPremiumCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREMIUM_CACHE_KEY);
}

/**
 * Check whether the currently logged-in user has an active premium subscription.
 * Uses a short-lived localStorage cache to avoid repeated DB queries.
 */
export async function checkPremiumStatus(): Promise<{ isPremium: boolean; premiumUntil: string | null }> {
  // Check cache first
  const cached = getCachedPremiumStatus();
  if (cached) return { isPremium: cached.isPremium, premiumUntil: cached.premiumUntil };

  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCachedPremiumStatus(false, null);
      return { isPremium: false, premiumUntil: null };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('account_type, premium_until')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!profile) {
      setCachedPremiumStatus(false, null);
      return { isPremium: false, premiumUntil: null };
    }

    const isPremium =
      profile.account_type === 'premium' &&
      !!profile.premium_until &&
      new Date(profile.premium_until) > new Date();

    setCachedPremiumStatus(isPremium, profile.premium_until);
    return { isPremium, premiumUntil: profile.premium_until };
  } catch (err) {
    console.error('Failed to check premium status:', err);
    return { isPremium: false, premiumUntil: null };
  }
}

/** Format seconds into "MM:SS". */
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
