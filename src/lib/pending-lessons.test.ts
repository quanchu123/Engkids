import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readPendingLessons,
  enqueuePendingLesson,
  clearPendingLessons,
  flushPendingLessons,
  type PendingLesson,
} from './pending-lessons';

const STORAGE_KEY = 'kids.pendingLessons.v1';

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

function makeEntry(overrides: Partial<PendingLesson> = {}): PendingLesson {
  return {
    lessonId: 'lesson-1',
    completedSteps: 5,
    totalSteps: 5,
    scorePercent: 100,
    lastStepId: 'step-5',
    finishedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  storage = makeStorageStub();
  (globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: storage as unknown as Storage,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enqueuePendingLesson / readPendingLessons', () => {
  it('starts empty', () => {
    expect(readPendingLessons()).toEqual([]);
  });

  it('adds an entry', () => {
    enqueuePendingLesson(makeEntry());
    const all = readPendingLessons();
    expect(all).toHaveLength(1);
    expect(all[0].lessonId).toBe('lesson-1');
  });

  it('dedupes by lessonId, keeping the latest result', () => {
    enqueuePendingLesson(makeEntry({ scorePercent: 60 }));
    enqueuePendingLesson(makeEntry({ scorePercent: 100 }));
    const all = readPendingLessons();
    expect(all).toHaveLength(1);
    expect(all[0].scorePercent).toBe(100);
  });

  it('keeps separate entries for different lessons', () => {
    enqueuePendingLesson(makeEntry({ lessonId: 'a' }));
    enqueuePendingLesson(makeEntry({ lessonId: 'b' }));
    expect(readPendingLessons().map((l) => l.lessonId).sort()).toEqual(['a', 'b']);
  });

  it('is resilient to a corrupt stored value', () => {
    storage.setItem(STORAGE_KEY, '{not json');
    expect(readPendingLessons()).toEqual([]);
    enqueuePendingLesson(makeEntry());
    expect(readPendingLessons()).toHaveLength(1);
  });

  it('is resilient to a non-array stored value', () => {
    storage.setItem(STORAGE_KEY, '{"foo":"bar"}');
    expect(readPendingLessons()).toEqual([]);
  });
});

describe('clearPendingLessons', () => {
  it('removes everything', () => {
    enqueuePendingLesson(makeEntry({ lessonId: 'a' }));
    enqueuePendingLesson(makeEntry({ lessonId: 'b' }));
    clearPendingLessons();
    expect(readPendingLessons()).toEqual([]);
  });
});

describe('flushPendingLessons', () => {
  it('is a no-op when the queue is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await flushPendingLessons();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts each entry and clears the queue on success', async () => {
    enqueuePendingLesson(makeEntry({ lessonId: 'a' }));
    enqueuePendingLesson(makeEntry({ lessonId: 'b' }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await flushPendingLessons();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readPendingLessons()).toEqual([]);
  });

  it('posts to the correct lesson progress endpoint with the right body', async () => {
    enqueuePendingLesson(makeEntry({ lessonId: 'lesson-xyz', scorePercent: 80 }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await flushPendingLessons();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/lessons/lesson-xyz/progress');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      status: 'done',
      completedSteps: 5,
      totalSteps: 5,
      scorePercent: 80,
      lastStepId: 'step-5',
    });
  });

  it('keeps entries that fail with a non-ok response', async () => {
    enqueuePendingLesson(makeEntry({ lessonId: 'ok-one' }));
    enqueuePendingLesson(makeEntry({ lessonId: 'fail-one' }));
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({ ok: !String(url).includes('fail-one') }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await flushPendingLessons();

    const survivors = readPendingLessons();
    expect(survivors).toHaveLength(1);
    expect(survivors[0].lessonId).toBe('fail-one');
  });

  it('keeps entries that throw (network error)', async () => {
    enqueuePendingLesson(makeEntry({ lessonId: 'a' }));
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await flushPendingLessons();

    expect(readPendingLessons()).toHaveLength(1);
  });
});
