/**
 * Admin Icon Configuration
 *
 * Reads the pre-downloaded Iconscout manifest (`public/assets/iconscout/manifest.json`)
 * and exposes a safe lookup from admin icon keys to their static asset paths.
 *
 * Progressive enhancement: if no asset exists for a key (manifest empty, entry
 * skipped/errored, or manifest malformed), `getAdminIconSrc` returns `null` so
 * callers can fall back to lucide-react icons. No Iconscout API calls happen at
 * runtime — the manifest is a static import.
 */

// The manifest file always exists (Task 10.1 ships a default `{ "results": [] }`),
// so a static import is safe. It is typed as `unknown` and narrowed defensively
// below: an empty default would otherwise be inferred as `results: never[]`, and a
// malformed manifest must never break the build or runtime.
import manifestJson from '../../public/assets/iconscout/manifest.json';

/** Admin icon keys used across the admin UI (sidebar nav, stat cards, etc.). */
export type AdminIconKey = 'stories' | 'videos' | 'games' | 'music' | 'dashboard' | 'upload';

/**
 * Maps each admin icon key to the manifest entry `name` used by
 * `scripts/download-iconscout-assets.js` (the `admin-*` prefixed names).
 */
const MANIFEST_NAME: Record<AdminIconKey, string> = {
  stories: 'admin-stories',
  videos: 'admin-videos',
  games: 'admin-games',
  music: 'admin-music',
  dashboard: 'admin-dashboard',
  upload: 'admin-upload',
};

/** Shape of a single manifest entry we care about (other fields are ignored). */
interface ManifestEntry {
  name?: unknown;
  file?: unknown;
}

/**
 * Builds a `name -> file` lookup from the manifest, keeping only entries that
 * have both a non-empty `name` and a truthy `file` string. Skipped/error entries
 * (which lack a `file`) are ignored. Any parsing failure falls back to an empty
 * lookup so a malformed manifest can never break the build or runtime.
 */
function buildIconLookup(): Record<string, string> {
  const lookup: Record<string, string> = {};

  try {
    const manifest = manifestJson as { results?: unknown };
    const results = manifest?.results;

    if (!Array.isArray(results)) {
      return lookup;
    }

    for (const raw of results) {
      if (!raw || typeof raw !== 'object') continue;

      const entry = raw as ManifestEntry;
      const name = entry.name;
      const file = entry.file;

      if (typeof name === 'string' && name.length > 0 && typeof file === 'string' && file.length > 0) {
        lookup[name] = file;
      }
    }
  } catch {
    // Malformed manifest — fall back to an empty lookup (callers use lucide).
    return {};
  }

  return lookup;
}

const ICON_LOOKUP: Record<string, string> = buildIconLookup();

/**
 * Returns the static Iconscout asset path (e.g. `/assets/iconscout/admin-stories.png`)
 * for the given admin icon key if a valid asset exists in the manifest, otherwise
 * `null` so callers fall back to lucide-react icons.
 */
export function getAdminIconSrc(key: AdminIconKey): string | null {
  const name = MANIFEST_NAME[key];
  const src = ICON_LOOKUP[name];
  return typeof src === 'string' && src.length > 0 ? src : null;
}
