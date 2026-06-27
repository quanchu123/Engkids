'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, onAuthStateChange } from '@/lib/auth-client';
import { createDefaultProgress, DEFAULT_SETTINGS, mergeProgressSnapshots } from '@/lib/progress';
import { getDefaultEquipped } from '@/lib/avatar';
import { flushPendingLessons } from '@/lib/pending-lessons';
import { useAppStore } from '@/store/useAppStore';
import {
  loadRemoteProgressSnapshot,
  saveRemoteProgressSnapshot,
  isEmptyEconomy,
  EconomyState,
  AccountExtras,
} from '@/services/progress-sync';

const PROGRESS_OWNER_KEY = 'kids.progress.owner.v1';

/** Read the current economy slice from the store. */
function readEconomy(): EconomyState {
  const s = useAppStore.getState();
  return {
    coins: s.coins,
    streakFreezes: s.streakFreezes,
    lastSpinDate: s.lastSpinDate,
    ownedAvatarItems: s.ownedAvatarItems,
    equippedAvatar: s.equippedAvatar,
    pet: s.pet,
  };
}

function readExtras(): AccountExtras {
  const s = useAppStore.getState();
  return {
    completedLessonIds: s.completedLessonIds,
    wordInteractions: Array.from(s.wordInteractions.entries()),
  };
}

function mergeExtras(local: AccountExtras, remote?: AccountExtras): AccountExtras {
  const completedLessonIds = Array.from(
    new Set([...(remote?.completedLessonIds || []), ...local.completedLessonIds]),
  );
  const wordInteractions = new Map(remote?.wordInteractions || []);

  for (const [key, localValue] of local.wordInteractions) {
    const remoteValue = wordInteractions.get(key);
    if (!remoteValue || localValue.lastSeen.localeCompare(remoteValue.lastSeen) > 0) {
      wordInteractions.set(key, localValue);
    }
  }

  return {
    completedLessonIds,
    wordInteractions: Array.from(wordInteractions.entries()),
  };
}

export default function UserProgressSync() {
  const progress = useAppStore((state) => state.progress);
  const settings = useAppStore((state) => state.settings);
  const hydrated = useAppStore((state) => state.hydrated);
  // Economy fields — subscribed so a change triggers a debounced remote save.
  const coins = useAppStore((state) => state.coins);
  const streakFreezes = useAppStore((state) => state.streakFreezes);
  const lastSpinDate = useAppStore((state) => state.lastSpinDate);
  const ownedAvatarItems = useAppStore((state) => state.ownedAvatarItems);
  const equippedAvatar = useAppStore((state) => state.equippedAvatar);
  const pet = useAppStore((state) => state.pet);
  const completedLessonIds = useAppStore((state) => state.completedLessonIds);
  const wordInteractions = useAppStore((state) => state.wordInteractions);
  const replaceEconomy = useAppStore((state) => state.replaceEconomy);
  const [userId, setUserId] = useState<string | null>(null);

  const initializedUserIdRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);
  const readyToSaveRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshot = useMemo(() => ({ progress, settings }), [progress, settings]);
  const economy = useMemo<EconomyState>(
    () => ({ coins, streakFreezes, lastSpinDate, ownedAvatarItems, equippedAvatar, pet }),
    [coins, streakFreezes, lastSpinDate, ownedAvatarItems, equippedAvatar, pet],
  );
  const extras = useMemo<AccountExtras>(
    () => ({
      completedLessonIds,
      wordInteractions: Array.from(wordInteractions.entries()),
    }),
    [completedLessonIds, wordInteractions],
  );

  useEffect(() => {
    let isMounted = true;

    getCurrentUser().then((user) => {
      if (isMounted) {
        setUserId(user?.id || null);
      }
    });

    const subscription = onAuthStateChange((user) => {
      if (isMounted) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        setUserId(user?.id || null);
        if (!user) {
          initializedUserIdRef.current = null;
          readyToSaveRef.current = false;
          window.localStorage.removeItem(PROGRESS_OWNER_KEY);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !userId || initializedUserIdRef.current === userId) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      readyToSaveRef.current = false;
      applyingRemoteRef.current = true;

      const cachedOwnerId = window.localStorage.getItem(PROGRESS_OWNER_KEY);
      const isSwitchingAccount = cachedOwnerId && cachedOwnerId !== userId;

      // Capture the local economy AND learning progress BEFORE any reset so we
      // can preserve coins/pet/stories/words earned before this account ever
      // synced (same-account first run, or guest play before logging in).
      const localEconomy = readEconomy();
      const localExtras = readExtras();
      const localState = useAppStore.getState();
      const localSnapshot = {
        progress: localState.progress,
        settings: localState.settings,
      };

      if (isSwitchingAccount) {
        window.localStorage.removeItem('kids.progress.v2');
      }

      useAppStore.setState({
        progress: createDefaultProgress(),
        settings: DEFAULT_SETTINGS,
      });
      // On account switch, also clear economy so coins/pets never leak across users.
      if (isSwitchingAccount) {
        replaceEconomy({
          coins: 0,
          streakFreezes: 0,
          lastSpinDate: null,
          ownedAvatarItems: [],
          equippedAvatar: getDefaultEquipped(),
          pet: null,
        });
        useAppStore.setState({
          completedLessonIds: [],
          wordInteractions: new Map(),
        });
      }

      const remoteSnapshot = await loadRemoteProgressSnapshot();
      if (cancelled) return;

      if (!remoteSnapshot) {
        // New account (no remote row yet). Keep whatever the child did locally —
        // guest stories/words/stars — instead of the default reset above, unless
        // we're switching accounts (then local belongs to the previous user).
        if (!isSwitchingAccount) {
          useAppStore.setState({
            progress: localSnapshot.progress,
            settings: localSnapshot.settings,
            completedLessonIds: localExtras.completedLessonIds,
            wordInteractions: new Map(localExtras.wordInteractions),
          });
        }
        applyingRemoteRef.current = false;
        readyToSaveRef.current = true;
        initializedUserIdRef.current = userId;
        return;
      }

      // Merge guest/local progress into the remote snapshot so logging in never
      // wipes work done before sync. On account switch we discard local (it
      // belongs to the previous user) and adopt remote as-is.
      const mergedSnapshot = isSwitchingAccount
        ? remoteSnapshot
        : mergeProgressSnapshots(localSnapshot, remoteSnapshot);

      useAppStore.setState({
        progress: mergedSnapshot.progress,
        settings: mergedSnapshot.settings,
      });

      // Economy: adopt remote when it has data; otherwise keep the local values
      // (unless switching accounts) so a first sync doesn't wipe earned coins.
      const useLocal = !isSwitchingAccount && isEmptyEconomy(remoteSnapshot.economy);
      const chosen = useLocal ? localEconomy : remoteSnapshot.economy;
      replaceEconomy({
        coins: chosen.coins,
        streakFreezes: chosen.streakFreezes,
        lastSpinDate: chosen.lastSpinDate,
        ownedAvatarItems: chosen.ownedAvatarItems,
        equippedAvatar: chosen.equippedAvatar || getDefaultEquipped(),
        pet: chosen.pet,
      });

      const chosenExtras = isSwitchingAccount
        ? (remoteSnapshot.extras || { completedLessonIds: [], wordInteractions: [] })
        : mergeExtras(localExtras, remoteSnapshot.extras);
      useAppStore.setState({
        completedLessonIds: chosenExtras.completedLessonIds,
        wordInteractions: new Map(chosenExtras.wordInteractions),
      });

      window.localStorage.setItem(PROGRESS_OWNER_KEY, userId);
      applyingRemoteRef.current = false;
      readyToSaveRef.current = true;
      initializedUserIdRef.current = userId;
    };

    initialize()
      .then(() => {
        if (cancelled) return;
        // Now that we're signed in, push any lessons the child finished as a
        // guest up to their account. Failures stay queued for the next attempt.
        flushPendingLessons().catch((error) => {
          console.error('Failed to flush pending lessons:', error);
        });
      })
      .catch((error) => {
        console.error('Failed to initialize progress sync:', error);
        applyingRemoteRef.current = false;
        readyToSaveRef.current = false;
        initializedUserIdRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, replaceEconomy]);

  useEffect(() => {
    if (!hydrated || !userId || !readyToSaveRef.current || applyingRemoteRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveRemoteProgressSnapshot(snapshot, economy, extras).catch((error) => {
        console.error('Failed to sync progress:', error);
      });
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [snapshot, economy, extras, hydrated, userId]);

  return null;
}
