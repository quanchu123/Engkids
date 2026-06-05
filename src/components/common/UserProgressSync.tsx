'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, onAuthStateChange } from '@/lib/auth-client';
import { createDefaultProgress, DEFAULT_SETTINGS } from '@/lib/progress';
import { useAppStore } from '@/store/useAppStore';
import { loadRemoteProgressSnapshot, saveRemoteProgressSnapshot } from '@/services/progress-sync';

const PROGRESS_OWNER_KEY = 'kids.progress.owner.v1';

export default function UserProgressSync() {
  const progress = useAppStore((state) => state.progress);
  const settings = useAppStore((state) => state.settings);
  const hydrated = useAppStore((state) => state.hydrated);
  const [userId, setUserId] = useState<string | null>(null);

  const initializedUserIdRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);
  const readyToSaveRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshot = useMemo(() => ({ progress, settings }), [progress, settings]);

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

      if (isSwitchingAccount) {
        window.localStorage.removeItem('kids.progress.v2');
      }

      useAppStore.setState({
        progress: createDefaultProgress(),
        settings: DEFAULT_SETTINGS,
      });

      const remoteSnapshot = await loadRemoteProgressSnapshot();
      if (cancelled) return;

      if (!remoteSnapshot) {
        applyingRemoteRef.current = false;
        readyToSaveRef.current = true;
        initializedUserIdRef.current = userId;
        return;
      }

      useAppStore.setState({
        progress: remoteSnapshot.progress,
        settings: remoteSnapshot.settings,
      });

      window.localStorage.setItem(PROGRESS_OWNER_KEY, userId);
      applyingRemoteRef.current = false;
      readyToSaveRef.current = true;
      initializedUserIdRef.current = userId;
    };

    initialize().catch((error) => {
      console.error('Failed to initialize progress sync:', error);
      applyingRemoteRef.current = false;
      readyToSaveRef.current = false;
      initializedUserIdRef.current = null;
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

  useEffect(() => {
    if (!hydrated || !userId || !readyToSaveRef.current || applyingRemoteRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveRemoteProgressSnapshot(snapshot).catch((error) => {
        console.error('Failed to sync progress:', error);
      });
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [snapshot, hydrated, userId]);

  return null;
}
