'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, onAuthStateChange } from '@/lib/auth-client';
import { mergeProgressSnapshots } from '@/lib/progress';
import { useAppStore } from '@/store/useAppStore';
import { loadRemoteProgressSnapshot, saveRemoteProgressSnapshot } from '@/services/progress-sync';

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
        setUserId(user?.id || null);
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
      const remoteSnapshot = await loadRemoteProgressSnapshot();
      if (cancelled) return;

      if (!remoteSnapshot) {
        readyToSaveRef.current = true;
        initializedUserIdRef.current = userId;
        return;
      }

      const localSnapshot = {
        progress: useAppStore.getState().progress,
        settings: useAppStore.getState().settings,
      };
      const merged = mergeProgressSnapshots(localSnapshot, remoteSnapshot);

      applyingRemoteRef.current = true;
      useAppStore.setState({
        progress: merged.progress,
        settings: merged.settings,
      });

      await saveRemoteProgressSnapshot(merged);

      applyingRemoteRef.current = false;
      readyToSaveRef.current = true;
      initializedUserIdRef.current = userId;
    };

    initialize().catch((error) => {
      console.error('Failed to initialize progress sync:', error);
      applyingRemoteRef.current = false;
      readyToSaveRef.current = true;
      initializedUserIdRef.current = userId;
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
