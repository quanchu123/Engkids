// ============================================
// DIGITALOCEAN SPACES (S3-compatible) STORAGE SERVICE
// Server-side only. Stores uploaded video files and serves them
// publicly through the Spaces CDN. Plays as direct MP4 via <video>.
// ============================================
import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Allowed upload types and their extensions.
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'ogg'] as const;
export const ALLOWED_VIDEO_CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogg: 'video/ogg',
};

// Maximum upload size: ~2 GB (per spec).
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

// How long a presigned upload URL stays valid (seconds).
const UPLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour

export interface SpacesConfig {
  region: string;
  endpoint: string;
  bucket: string;
  cdnBase: string;
  accessKey: string;
  secretKey: string;
}

/**
 * Read and validate the Spaces configuration from the environment.
 * Throws a configuration error naming the missing settings.
 */
export function getSpacesConfig(): SpacesConfig {
  const region = process.env.DO_SPACES_REGION;
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const bucket = process.env.DO_SPACES_BUCKET;
  // CDN base is optional in config but recommended; fall back to the origin.
  const cdnBase = process.env.DO_SPACES_CDN_ENDPOINT;
  const accessKey = process.env.DO_SPACES_KEY;
  const secretKey = process.env.DO_SPACES_SECRET;

  const missing: string[] = [];
  if (!region) missing.push('DO_SPACES_REGION');
  if (!endpoint) missing.push('DO_SPACES_ENDPOINT');
  if (!bucket) missing.push('DO_SPACES_BUCKET');
  if (!accessKey) missing.push('DO_SPACES_KEY');
  if (!secretKey) missing.push('DO_SPACES_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `DigitalOcean Spaces is not configured. Missing: ${missing.join(', ')}`,
    );
  }

  // Default the public CDN base to the bucket origin if a dedicated CDN
  // endpoint was not provided.
  const resolvedCdnBase =
    cdnBase || `${endpoint!.replace('https://', `https://${bucket}.`)}`;

  return {
    region: region!,
    endpoint: endpoint!,
    bucket: bucket!,
    cdnBase: resolvedCdnBase.replace(/\/+$/, ''),
    accessKey: accessKey!,
    secretKey: secretKey!,
  };
}

/** True when all required Spaces settings are present. */
export function isSpacesConfigured(): boolean {
  try {
    getSpacesConfig();
    return true;
  } catch {
    return false;
  }
}

let cachedClient: S3Client | null = null;

function getClient(): { client: S3Client; config: SpacesConfig } {
  const config = getSpacesConfig();
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      // Spaces uses virtual-hosted-style URLs; the SDK handles this for us.
      forcePathStyle: false,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }
  return { client: cachedClient, config };
}

/** Normalize and validate a file extension against the allowed set. */
export function normalizeExtension(extension: string): string | null {
  const ext = String(extension || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)
    ? ext
    : null;
}

/**
 * Generate a unique object key for a new upload. Uses a UUID so keys never
 * collide with existing objects in the bucket.
 */
export function generateObjectKey(extension: string): string {
  const ext = normalizeExtension(extension) || 'mp4';
  return `videos/${randomUUID()}.${ext}`;
}

/**
 * Create a presigned PUT URL that authorizes a single direct
 * browser-to-Spaces upload to a unique object key.
 */
export async function createPresignedUpload(extension: string): Promise<{
  uploadUrl: string;
  objectKey: string;
  contentType: string;
  maxBytes: number;
  expiresIn: number;
}> {
  const ext = normalizeExtension(extension);
  if (!ext) {
    throw new Error(
      `Unsupported file type. Allowed: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`,
    );
  }

  const { client, config } = getClient();
  const objectKey = generateObjectKey(ext);
  const contentType = ALLOWED_VIDEO_CONTENT_TYPES[ext];

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    ContentType: contentType,
    // Objects are public and served via the CDN.
    ACL: 'public-read',
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return {
    uploadUrl,
    objectKey,
    contentType,
    maxBytes: MAX_VIDEO_BYTES,
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  };
}

/**
 * Build the deterministic public CDN URL for a stored object key.
 */
export function getVideoPublicUrl(objectKey: string): string {
  if (!objectKey) return '';
  // Already a full URL (e.g. legacy/migrated rows) — return as-is.
  if (/^https?:\/\//i.test(objectKey)) return objectKey;
  const { cdnBase } = getSpacesConfig();
  const key = objectKey.replace(/^\/+/, '');
  return `${cdnBase}/${key}`;
}

/** Delete an object from the Spaces bucket. */
export async function deleteVideoObject(objectKey: string): Promise<void> {
  if (!objectKey || /^https?:\/\//i.test(objectKey)) return;
  const { client, config } = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey.replace(/^\/+/, ''),
    }),
  );
}

/** Check whether an object exists in the bucket (used by migration tooling). */
export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    const { client, config } = getClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: objectKey.replace(/^\/+/, ''),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload a buffer directly to Spaces under a new object key (server-side).
 * Used by the one-time migration tool. Returns the stored object key.
 */
export async function uploadVideoBuffer(
  body: Buffer | Uint8Array,
  extension: string,
): Promise<string> {
  const ext = normalizeExtension(extension) || 'mp4';
  const { client, config } = getClient();
  const objectKey = generateObjectKey(ext);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: ALLOWED_VIDEO_CONTENT_TYPES[ext] || 'video/mp4',
      ACL: 'public-read',
    }),
  );

  return objectKey;
}
