// Supabase Storage helpers (server-side).
// Videos are stored in a public bucket and played via a native <video> element.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const VIDEO_BUCKET = 'videos';
// Supabase free tier caps individual files at 50MB by default.
export const MAX_STORAGE_FILE_BYTES = 50 * 1024 * 1024;

function getStorageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(url, serviceKey);
}

// Only attempt bucket creation once per server lifetime.
let bucketEnsured = false;

export async function ensureVideoBucket(): Promise<void> {
  if (bucketEnsured) return;
  const supabase = getStorageAdmin();

  const { data: existing } = await supabase.storage.getBucket(VIDEO_BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(VIDEO_BUCKET, {
      public: true,
      fileSizeLimit: MAX_STORAGE_FILE_BYTES,
    });
    // Ignore "already exists" races
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }
  bucketEnsured = true;
}

/**
 * Create a signed upload URL so the browser can upload the file directly to
 * Supabase Storage (bypassing the serverless body-size limit).
 */
export async function createVideoUploadUrl(extension: string): Promise<{
  path: string;
  token: string;
  bucket: string;
}> {
  await ensureVideoBucket();
  const supabase = getStorageAdmin();

  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  const path = `${randomUUID()}.${safeExt}`;

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message}`);
  }

  return { path: data.path, token: data.token, bucket: VIDEO_BUCKET };
}

export function getVideoPublicUrl(path: string): string {
  const supabase = getStorageAdmin();
  return supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteVideoFromStorage(path: string): Promise<void> {
  const supabase = getStorageAdmin();
  await supabase.storage.from(VIDEO_BUCKET).remove([path]);
}
