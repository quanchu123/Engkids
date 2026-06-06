import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVideoProgress,
  setVideoProgress,
  clearVideoProgress,
  shouldResume,
} from './video-progress';

const STORAGE_KEY = 'engkids.videoProgress';

/** Minimal in-memory localStorage stub. */
function makeStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
    _store: store,
  };
}

let storage: ReturnType<typeof makeStorageStub>;

beforeEach(() => {
  storage = makeStorageStub();
  // jsdom/node: attach our stub as window.localStorage.
  (globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: storage as unknown as Storage,
  };
});

describe('getVideoProgress / setVideoProgress', () => {
  it('round-trips a saved position', () => {
    setVideoProgress('v1', 42);
    expect(getVideoProgress('v1')).toBe(42);
  });

  it('returns 0 when nothing saved', () => {
    expect(getVideoProgress('missing')).toBe(0);
  });

  it('keeps separate positions per video id', () => {
    setVideoProgress('v1', 30);
    setVideoProgress('v2', 99);
    expect(getVideoProgress('v1')).toBe(30);
    expect(getVideoProgress('v2')).toBe(99);
  });

  it('ignores values below the 2s threshold', () => {
    setVideoProgress('v1', 1.5);
    expect(getVideoProgress('v1')).toBe(0);
    setVideoProgress('v1', 0);
    expect(getVideoProgress('v1')).toBe(0);
  });

  it('persists the underlying JSON under the expected key', () => {
    setVideoProgress('v1', 12);
    const raw = storage.getItem(STORAGE_KEY)!;
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.v1.seconds).toBe(12);
    expect(typeof parsed.v1.updatedAt).toBe('string');
  });

  it('is resilient to a corrupt stored value', () => {
    storage.setItem(STORAGE_KEY, '{not json');
    expect(getVideoProgress('v1')).toBe(0);
    // Writing still works afterwards.
    setVideoProgress('v1', 20);
    expect(getVideoProgress('v1')).toBe(20);
  });

  it('is resilient to a non-object stored value', () => {
    storage.setItem(STORAGE_KEY, '"a string"');
    expect(getVideoProgress('v1')).toBe(0);
  });
});

describe('clearVideoProgress', () => {
  it('removes a saved position', () => {
    setVideoProgress('v1', 50);
    clearVideoProgress('v1');
    expect(getVideoProgress('v1')).toBe(0);
  });

  it('is a no-op for unknown ids', () => {
    expect(() => clearVideoProgress('nope')).not.toThrow();
  });
});

describe('shouldResume', () => {
  it('is false at or below 5 seconds', () => {
    expect(shouldResume(5, 100)).toBe(false);
    expect(shouldResume(4, 100)).toBe(false);
  });

  it('is true above 5 seconds with no/unknown duration', () => {
    expect(shouldResume(6, 0)).toBe(true);
  });

  it('is false within the last 5 seconds of a known duration', () => {
    expect(shouldResume(96, 100)).toBe(false); // 100 - 5 = 95, 96 not < 95
    expect(shouldResume(95, 100)).toBe(false); // exactly the boundary
    expect(shouldResume(94, 100)).toBe(true);
  });
});
