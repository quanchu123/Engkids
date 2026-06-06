/**
 * Video resume progress — pure, SSR-safe persistence of how far a child has
 * watched each video, stored in localStorage so they can pick up where they
 * left off. No network, no React. All browser access is feature-detected and
 * wrapped in try/catch so it never throws (safe during SSR and in privacy
 * modes). The stored shape is a map keyed by video id:
 *
 *   { [videoId]: { seconds: number; updatedAt: string } }
 */

const STORAGE_KEY = 'engkids.videoProgress';

/** Minimum watched seconds before we bother persisting anything. */
const MIN_SAVE_SECONDS = 2;

interface VideoProgressEntry {
  seconds: number;
  updatedAt: string;
}

type VideoProgressMap = Record<string, VideoProgressEntry>;

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read and validate the whole progress map. Resilient to corrupt values. */
function readMap(): VideoProgressMap {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: VideoProgressMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === 'object' && typeof (value as VideoProgressEntry).seconds === 'number') {
        const entry = value as VideoProgressEntry;
        out[key] = {
          seconds: entry.seconds,
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: VideoProgressMap): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/** Saved watched position for a video, in seconds. 0 when none / unavailable. */
export function getVideoProgress(videoId: string): number {
  if (!videoId) return 0;
  const entry = readMap()[videoId];
  return entry && typeof entry.seconds === 'number' && entry.seconds > 0 ? entry.seconds : 0;
}

/** Persist the watched position. Ignores tiny values (< MIN_SAVE_SECONDS). */
export function setVideoProgress(videoId: string, seconds: number): void {
  if (!videoId) return;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < MIN_SAVE_SECONDS) return;
  const map = readMap();
  map[videoId] = { seconds, updatedAt: new Date().toISOString() };
  writeMap(map);
}

/** Forget the saved position for a video (e.g. when it finishes). */
export function clearVideoProgress(videoId: string): void {
  if (!videoId) return;
  const map = readMap();
  if (map[videoId] === undefined) return;
  delete map[videoId];
  writeMap(map);
}

/**
 * Whether it makes sense to offer "resume" for a saved position. Pure.
 * - Need more than 5s watched to be worth resuming.
 * - If we know the duration, don't resume within the last 5s (basically done).
 */
export function shouldResume(savedSeconds: number, duration: number): boolean {
  if (typeof savedSeconds !== 'number' || savedSeconds <= 5) return false;
  if (typeof duration === 'number' && duration > 0) {
    return savedSeconds < duration - 5;
  }
  return true;
}
