'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  checkPremiumStatus,
  getUsedSecondsToday,
  addUsageSeconds,
  getRemainingSeconds,
  formatTime,
  clearPremiumCache,
} from '@/lib/freemium';
import { FREEMIUM_DAILY_MINUTES } from '@/lib/payment';

export interface FreemiumState {
  /** True while we're fetching premium status from the DB. */
  loading: boolean;
  /** User has an active premium subscription. */
  isPremium: boolean;
  /** ISO date string of premium expiry (null if not premium). */
  premiumUntil: string | null;
  /** Seconds remaining today (only relevant for Freemium users). */
  remainingSeconds: number;
  /** "MM:SS" formatted string of remaining time. */
  remainingFormatted: string;
  /** True when the free daily limit has been exhausted. */
  isExpired: boolean;
  /** Total daily allowance in minutes. */
  dailyLimitMinutes: number;
  /** Force-refresh premium status (e.g. after purchase). */
  refreshPremium: () => Promise<void>;
}

export interface UseFreemiumOptions {
  trackUsage?: boolean;
}

/**
 * React hook to manage Freemium state.
 * Counts down usage every second while the component is mounted unless
 * `trackUsage` is set to false for exempt routes such as assessments.
 * Call `refreshPremium()` after a payment is confirmed to clear the cache.
 */
export function useFreemium(options: UseFreemiumOptions = {}): FreemiumState {
  const { trackUsage = true } = options;
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(FREEMIUM_DAILY_MINUTES * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load premium status
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkPremiumStatus();
      setIsPremium(result.isPremium);
      setPremiumUntil(result.premiumUntil);
    } catch {
      // Assume freemium on error
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPremium = useCallback(async () => {
    clearPremiumCache();
    await loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Tick timer every second for freemium users
  useEffect(() => {
    if (isPremium || loading || !trackUsage) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!trackUsage) {
        setRemainingSeconds(getRemainingSeconds());
      }
      return;
    }

    // Sync from localStorage on mount
    setRemainingSeconds(getRemainingSeconds());

    timerRef.current = setInterval(() => {
      addUsageSeconds(1);
      const remaining = getRemainingSeconds();
      setRemainingSeconds(remaining);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPremium, loading, trackUsage]);

  return {
    loading,
    isPremium,
    premiumUntil,
    remainingSeconds,
    remainingFormatted: formatTime(remainingSeconds),
    isExpired: !isPremium && remainingSeconds <= 0,
    dailyLimitMinutes: FREEMIUM_DAILY_MINUTES,
    refreshPremium,
  };
}
