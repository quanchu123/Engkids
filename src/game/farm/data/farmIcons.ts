// Farm icon lookup for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports. Reads the pre-downloaded
// Iconscout manifest (`public/games/english-farm/icons/manifest.json`) and
// exposes a safe lookup from icon names to their static asset paths.
//
// Progressive enhancement (mirrors `src/config/admin-icons.ts`): if no asset
// exists for a name (manifest empty, entry skipped/errored, or manifest
// malformed), `farmIconSrc` returns `null` so callers can fall back to an emoji.
// No Iconscout API calls happen at runtime — the manifest is a static import.

// The manifest ships alongside the downloaded icons, so a static import is safe
// (tsconfig has `resolveJsonModule: true`). It is typed as `unknown` and narrowed
// defensively below: a malformed manifest must never break the build or runtime.
import manifestJson from '../../../../public/games/english-farm/icons/manifest.json'

/** Shape of a single manifest entry we care about (other fields are ignored). */
interface ManifestEntry {
  name?: unknown
  file?: unknown
}

/**
 * Builds a `name -> file` lookup from the manifest, keeping only entries that
 * have both a non-empty `name` and a truthy `file` string. Skipped/error entries
 * (which lack a `file`) are ignored. Any parsing failure falls back to an empty
 * lookup so a malformed/missing manifest can never break the build or runtime.
 */
function buildIconLookup(): Record<string, string> {
  const lookup: Record<string, string> = {}

  try {
    const manifest = manifestJson as { results?: unknown }
    const results = manifest?.results

    if (!Array.isArray(results)) {
      return lookup
    }

    for (const raw of results) {
      if (!raw || typeof raw !== 'object') continue

      const entry = raw as ManifestEntry
      const name = entry.name
      const file = entry.file

      if (
        typeof name === 'string' &&
        name.length > 0 &&
        typeof file === 'string' &&
        file.length > 0
      ) {
        lookup[name] = file
      }
    }
  } catch {
    // Malformed manifest — fall back to an empty lookup (callers use emoji).
    return {}
  }

  return lookup
}

const ICON_LOOKUP: Record<string, string> = buildIconLookup()

/**
 * Returns the static farm icon asset path (e.g.
 * `/games/english-farm/icons/carrot.png`) for the given icon name if a valid
 * asset exists in the manifest, otherwise `null` so callers fall back to an emoji.
 */
export function farmIconSrc(name: string): string | null {
  const src = ICON_LOOKUP[name]
  return typeof src === 'string' && src.length > 0 ? src : null
}
