// ============================================
// LOCAL DISK STORAGE SERVICE (DigitalOcean Droplet)
// ============================================
// Videos are stored on the droplet's persistent disk under public/uploads and
// served through /api/videos/file/<name> with HTTP Range support. Played as
// direct MP4 via the native <video> element. No external object store or CDN.
import { mkdir, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

// Allowed upload types and their extensions.
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'ogg'] as const;
export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'ogg', 'wav', 'm4a', 'aac'] as const;

// Maximum upload size: ~2 GB (hard safety cap).
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
// Background music: 20 MB is plenty for a looping track.
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

// Public route prefix and on-disk directory.
const PUBLIC_PREFIX = '/uploads';
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
const execFileAsync = promisify(execFile);

/** Normalize and validate a file extension against the allowed set. */
export function normalizeExtension(extension: string): string | null {
  const ext = String(extension || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)
    ? ext
    : null;
}

/** Normalize and validate an audio file extension against the allowed set. */
export function normalizeAudioExtension(extension: string): string | null {
  const ext = String(extension || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext) ? ext : null;
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
  // Serve through the streaming API route (HTTP Range support) instead of the
  // static /uploads path, which is unreliable for runtime-added files under
  // output: 'standalone'.
  const name = objectKey
    .replace(`${PUBLIC_PREFIX}/`, '')
    .replace(/^\/+/, '');
  return `/api/videos/file/${encodeURIComponent(name)}`;
}

function getUploadPath(objectKey: string): string {
  const name = objectKey.replace(`${PUBLIC_PREFIX}/`, '').replace(/^\/+/, '');
  return path.join(UPLOADS_DIR, path.basename(name));
}

function getGeneratedThumbnailKey(objectKey: string): string {
  const name = objectKey.replace(`${PUBLIC_PREFIX}/`, '').replace(/^\/+/, '');
  return `${path.parse(path.basename(name)).name}.jpg`;
}

/**
 * Generate a JPEG thumbnail from a stored video using the system ffmpeg binary.
 * Returns null if ffmpeg is unavailable or the video cannot be decoded.
 */
export async function generateVideoThumbnailObject(objectKey: string): Promise<{ objectKey: string; url: string } | null> {
  if (!objectKey || /^https?:\/\//i.test(objectKey)) return null;

  await mkdir(UPLOADS_DIR, { recursive: true });
  const videoPath = getUploadPath(objectKey);
  const thumbnailKey = getGeneratedThumbnailKey(objectKey);
  const thumbnailPath = getUploadPath(thumbnailKey);

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      '00:00:01',
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-2',
      '-q:v',
      '3',
      thumbnailPath,
    ], { timeout: 30_000 });

    return {
      objectKey: thumbnailKey,
      url: getVideoPublicUrl(thumbnailKey),
    };
  } catch (error) {
    await unlink(thumbnailPath).catch(() => {});
    console.warn('Failed to generate video thumbnail with ffmpeg:', error);
    return null;
  }
}

/**
 * Stream an incoming audio upload to disk (used for background music).
 * Returns the stored object key.
 */
export async function saveAudioStream(
  body: ReadableStream<Uint8Array>,
  extension: string,
): Promise<string> {
  const ext = normalizeAudioExtension(extension);
  if (!ext) {
    throw new Error(
      `Unsupported audio type. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`,
    );
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const objectKey = `${randomUUID()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, objectKey);

  let total = 0;
  const sizeGuard = new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length;
      if (total > MAX_AUDIO_BYTES) {
        cb(new Error('File too large (max 20MB)'));
        return;
      }
      cb(null, chunk);
    },
  });

  const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
  try {
    await pipeline(nodeStream, sizeGuard, createWriteStream(filePath));
  } catch (err) {
    await unlink(filePath).catch(() => {});
    throw err;
  }

  return objectKey;
}

/** Delete a stored video file from disk. */
export async function deleteVideoObject(objectKey: string): Promise<void> {
  if (!objectKey || /^https?:\/\//i.test(objectKey)) return;
  const name = objectKey.replace(`${PUBLIC_PREFIX}/`, '').replace(/^\/+/, '');
  await unlink(path.join(UPLOADS_DIR, path.basename(name))).catch(() => {});
  await unlink(getUploadPath(getGeneratedThumbnailKey(objectKey))).catch(() => {});
}
