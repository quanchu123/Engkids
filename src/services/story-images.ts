import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Story } from '@/types';
import { UPLOADS_DIR } from './storage';

const STORY_IMAGE_BUCKET = process.env.STORY_IMAGE_BUCKET || 'story-images';
const LOCAL_STORY_IMAGE_DIR = 'story-images';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

interface DecodedImage {
  bytes: Buffer;
  mimeType: string;
  extension: string;
}

function decodeDataImage(value: string): DecodedImage | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Story image too large');
  }

  return { bytes, mimeType, extension };
}

function getSupabaseStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function makeObjectKey(storyId: string, role: string, extension: string): string {
  const safeStoryId = storyId.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'story';
  return `${safeStoryId}/${role}-${randomUUID()}.${extension}`;
}

async function uploadToSupabase(objectKey: string, image: DecodedImage): Promise<string | null> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) return null;

  await supabase.storage.createBucket(STORY_IMAGE_BUCKET, { public: true }).catch(() => {});

  const { error } = await supabase.storage
    .from(STORY_IMAGE_BUCKET)
    .upload(objectKey, image.bytes, {
      contentType: image.mimeType,
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    console.warn('Supabase story image upload failed, using local fallback:', error.message);
    return null;
  }

  const { data } = supabase.storage.from(STORY_IMAGE_BUCKET).getPublicUrl(objectKey);
  return data.publicUrl;
}

async function uploadToLocal(objectKey: string, image: DecodedImage): Promise<string> {
  const safeKey = objectKey.replace(/\\/g, '/').split('/').filter(Boolean).join('/');
  const targetPath = path.join(UPLOADS_DIR, LOCAL_STORY_IMAGE_DIR, safeKey);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, image.bytes);
  return `/api/images/file/${LOCAL_STORY_IMAGE_DIR}/${safeKey}`;
}

export async function storeStoryImage(value: string, storyId: string, role: string): Promise<string> {
  if (!value.startsWith('data:image/')) return value;

  const image = decodeDataImage(value);
  if (!image) return value;

  const objectKey = makeObjectKey(storyId, role, image.extension);
  const supabaseUrl = await uploadToSupabase(objectKey, image);
  if (supabaseUrl) return supabaseUrl;

  return uploadToLocal(objectKey, image);
}

export async function storeStoryImages(story: Story): Promise<Story> {
  const coverImage = await storeStoryImage(story.cover_image, story.id, 'cover');
  const panels = await Promise.all(story.panels.map(async (panel, index) => ({
    ...panel,
    image: await storeStoryImage(panel.image, story.id, `panel-${index + 1}`),
  })));

  return {
    ...story,
    cover_image: coverImage,
    panels,
  };
}
