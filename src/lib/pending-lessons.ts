// Queue of lessons a guest finished before logging in. We store them in
// localStorage so that the moment the child signs in, UserProgressSync can
// flush them to the DB (`lesson_progress`). Without this, guest lesson
// completions were silently dropped (the POST returned 401 and was swallowed).

const PENDING_LESSONS_KEY = 'kids.pendingLessons.v1';

export interface PendingLesson {
  lessonId: string;
  completedSteps: number;
  totalSteps: number;
  scorePercent: number;
  lastStepId?: string;
  finishedAt: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readPendingLessons(): PendingLesson[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(PENDING_LESSONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingLesson[]) : [];
  } catch {
    return [];
  }
}

function writePendingLessons(lessons: PendingLesson[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PENDING_LESSONS_KEY, JSON.stringify(lessons));
  } catch {
    /* storage full / disabled — nothing we can do, drop silently */
  }
}

// Add (or replace) a pending completion. Keyed by lessonId so finishing the
// same lesson twice while logged out keeps only the latest result.
export function enqueuePendingLesson(entry: PendingLesson): void {
  const current = readPendingLessons().filter((l) => l.lessonId !== entry.lessonId);
  current.push(entry);
  writePendingLessons(current);
}

export function clearPendingLessons(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PENDING_LESSONS_KEY);
  } catch {
    /* ignore */
  }
}

// Push every queued completion to the DB, now that the child is signed in.
// Each entry that saves successfully is removed; entries that fail (network,
// transient 5xx) stay queued for the next attempt. Safe to call repeatedly.
export async function flushPendingLessons(): Promise<void> {
  const pending = readPendingLessons();
  if (pending.length === 0) return;

  const survivors: PendingLesson[] = [];
  for (const entry of pending) {
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(entry.lessonId)}/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          completedSteps: entry.completedSteps,
          totalSteps: entry.totalSteps,
          scorePercent: entry.scorePercent,
          lastStepId: entry.lastStepId,
        }),
      });
      // 2xx = saved. 401 means we're somehow still not authed — keep it queued.
      if (!res.ok) survivors.push(entry);
    } catch {
      survivors.push(entry);
    }
  }

  writePendingLessons(survivors);
}
