/**
 * Broadcast content changes to other tabs so the homepage, /videos, /music
 * refresh immediately when an admin adds/updates/deletes content.
 *
 * Falls back to a localStorage 'storage' event when BroadcastChannel is
 * unavailable (older browsers / SSR).
 */
export type ContentChangeKind = 'videos' | 'stories' | 'site-settings' | 'all';

export function broadcastContentChange(kind: ContentChangeKind = 'all'): void {
  if (typeof window === 'undefined') return;
  const payload = { type: 'content-changed', kind, at: Date.now() };
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('engkids-content');
      channel.postMessage(payload);
      channel.close();
      return;
    }
  } catch {
    // fall through to localStorage
  }
  // localStorage fallback: any value change fires a 'storage' event in OTHER tabs.
  try {
    window.localStorage.setItem('engkids:content-changed', JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

/** Listen for content changes broadcast from other tabs. */
export function onContentChange(handler: (kind: ContentChangeKind) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const bcHandler = (event: MessageEvent) => {
    if (event.data?.type === 'content-changed') {
      handler(event.data.kind as ContentChangeKind);
    }
  };
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel('engkids-content');
      channel.addEventListener('message', bcHandler);
    } catch {
      channel = null;
    }
  }

  const storageHandler = (event: StorageEvent) => {
    if (event.key === 'engkids:content-changed' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        if (data?.type === 'content-changed') handler(data.kind as ContentChangeKind);
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    channel?.removeEventListener('message', bcHandler);
    channel?.close();
    window.removeEventListener('storage', storageHandler);
  };
}
