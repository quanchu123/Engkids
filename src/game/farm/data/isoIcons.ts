// Isometric cartoon art lookup for the English Farming Game.
//
// Pure TypeScript only — NO Phaser, NO React imports. Mirrors `farmIcons.ts`
// but reads the ISOMETRIC art manifest
// (`public/games/english-farm/iso/manifest.json`) and exposes a safe lookup
// from icon names to their static asset paths.
//
// Progressive enhancement (same contract as `farmIconSrc`): if no asset exists
// for a name (manifest empty, entry skipped/errored, or manifest malformed),
// `isoIconSrc` returns `null` so callers fall back to an emoji. No network calls
// happen at runtime — the manifest is a static import.

// The manifest ships alongside the downloaded art, so a static import is safe
// (tsconfig has `resolveJsonModule: true`). It is typed as `unknown` and narrowed
// defensively below: a malformed manifest must never break the build or runtime.
import manifestJson from '../../../../public/games/english-farm/iso/manifest.json'

/** Shape of a single manifest entry we care about (other fields are ignored). */
interface ManifestEntry {
  name?: unknown
  file?: unknown
}

/**
 * Builds a `name -> file` lookup from the manifest, keeping only entries that
 * have both a non-empty `name` and a truthy `file` string. Any parsing failure
 * falls back to an empty lookup so a malformed/missing manifest can never break
 * the build or runtime (callers degrade to emoji).
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
 * Conventional folder for user-supplied art overrides. Dropping a
 * `public/games/english-farm/assets/<name>.png` here (e.g. exported Unity art)
 * overrides the bundled Icons8 iso art for that name. There is no manifest for
 * this folder (its contents are not guaranteed), so we cannot stat the files at
 * build time — instead we reference the conventional path and let the scene's
 * `loaderror` fallback chain (override -> iso art -> emoji) handle the case
 * where no override file is present.
 */
const ASSETS_OVERRIDE_BASE = '/games/english-farm/assets'

/**
 * Preferred art source for `name`: a user override at
 * `public/games/english-farm/assets/<name>.png`. Only offered for names we
 * actually ship iso art for (present in the manifest), so we never reference an
 * arbitrary/unknown name. Returns `null` for unknown names. The scene loads this
 * first and, on `loaderror`, falls back to {@link isoFallbackSrc} (then to an
 * emoji). Never throws.
 */
export function isoIconSrc(name: string): string | null {
  if (typeof name !== 'string' || name.length === 0) return null
  // Only known art names get an override path; unknown names resolve to null.
  if (!Object.prototype.hasOwnProperty.call(ICON_LOOKUP, name)) return null
  return `${ASSETS_OVERRIDE_BASE}/${name}.png`
}

/**
 * Bundled isometric art path (e.g. `/games/english-farm/iso/carrot.png`) from
 * the iso manifest — the fallback used when no override asset is present.
 * Returns `null` for unknown names so callers fall back to an emoji. Never
 * throws.
 */
export function isoFallbackSrc(name: string): string | null {
  const src = ICON_LOOKUP[name]
  return typeof src === 'string' && src.length > 0 ? src : null
}
