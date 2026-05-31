// ============================================
// LOCAL DISK STORAGE SERVICE (DigitalOcean Droplet)
// ============================================
// Videos are stored on the droplet's persistent disk under public/uploads and
// served as static files at /uploads/<name>. Played as direct MP4 via the
// native <video> element. No external object store or CDN is used.
import { mkdir, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Allowed upload types and their extensions.
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'ogg'] as const;

// Maximum upload size: ~2 GB (hard safety cap).
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

// Public route prefix and on-disk directory.
const PUBLIC_PREFIX = '/uploads';
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/** Normalize and validate a file extension against the allowed set. */
export function normalizeExtension(extension: string): string | null {
  const ext = String(extension || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)
    ? ext
    : null;
}

/** Generate a unique object key (file name relative to the uploads dir). */
export function generateObjectKey(extension: string): string {
  const ext = normalizeExtension(extension) || 'mp4';
  return `${randomUUID()}.${ext}`;
}

/**
 * Stream an incoming web ReadableStream straight to disk (no full-file
 * buffering), enforcing the max size. Returns the stored object key.
 */
export async function saveVideoStream(
  body: ReadableStream<Uint8Array>,
  extension: string,
): Promise<string> {
  const ext = normalizeExtension(extension);
  if (!ext) {
    throw new Error(
      `Unsupported file type. Allowed: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`,
    );
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const objectKey = generateObjectKey(ext);
  const filePath = path.join(UPLOADS_DIR, objectKey);

  // Count bytes while streaming and abort if the cap is exceeded.
  let total = 0;
  const sizeGuard = new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length;
      if (total > MAX_VIDEO_BYTES) {
        cb(new Error('File too large (max 2GB)'));
        return;
      }
      cb(null, chunk);
    },
  });

  const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
  try {
    await pipeline(nodeStream, sizeGuard, createWriteStream(filePath));
  } catch (err) {
    await unlink(filePath).catch(() => {}); // clean up partial file
    throw err;
  }

  return objectKey;
}

/** Build the public URL for a stored object key. */
export function getVideoPublicUrl(objectKey: string): string {
  if (!objectKey) return '';
  if (/^https?:\/\//i.test(objectKey)) return objectKey; // legacy full URL
  if (objectKey.startsWith(PUBLIC_PREFIX)) return objectKey; // already a path
  return `${PUBLIC_PREFIX}/${objectKey.replace(/^\/+/, '')}`;
}

/** Delete a stored video file from disk. */
export async function deleteVideoObject(objectKey: string): Promise<void> {
  if (!objectKey || /^https?:\/\//i.test(objectKey)) return;
  const name = objectKey.replace(`${PUBLIC_PREFIX}/`, '').replace(/^\/+/, '');
  await unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
}
