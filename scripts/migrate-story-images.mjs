import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

loadEnv({ path: '.env.local', override: false });

const bucket = process.env.STORY_IMAGE_BUCKET || 'story-images';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const mimeExtensions = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[story-images] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function decodeDataImage(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const extension = mimeExtensions[mimeType];
  if (!extension) throw new Error(`Unsupported image type: ${mimeType}`);
  return { bytes: Buffer.from(match[2], 'base64'), mimeType, extension };
}

function objectKey(storyId, role, extension) {
  const safeStoryId = String(storyId || 'story').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `${safeStoryId}/${role}-${randomUUID()}.${extension}`;
}

async function uploadImage(storyId, role, value) {
  const image = decodeDataImage(value);
  if (!image) return value;

  const key = objectKey(storyId, role, image.extension);
  const { error } = await supabase.storage.from(bucket).upload(key, image.bytes, {
    contentType: image.mimeType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed for ${storyId}/${role}: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

async function main() {
  await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});

  const { data: stories, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch stories: ${error.message}`);

  let updatedStories = 0;
  let uploadedImages = 0;

  for (const story of stories || []) {
    let changed = false;
    const nextStory = { ...story };

    const nextCover = await uploadImage(story.id, 'cover', story.cover_image);
    if (nextCover !== story.cover_image) {
      nextStory.cover_image = nextCover;
      changed = true;
      uploadedImages += 1;
    }

    const panels = Array.isArray(story.panels) ? story.panels : [];
    nextStory.panels = [];
    for (let index = 0; index < panels.length; index += 1) {
      const panel = panels[index];
      const nextImage = await uploadImage(story.id, `panel-${index + 1}`, panel?.image);
      if (nextImage !== panel?.image) {
        changed = true;
        uploadedImages += 1;
      }
      nextStory.panels.push({ ...panel, image: nextImage || '' });
    }

    if (!changed) continue;

    const { error: updateError } = await supabase
      .from('stories')
      .update({
        cover_image: nextStory.cover_image,
        panels: nextStory.panels,
      })
      .eq('id', story.id);

    if (updateError) throw new Error(`Failed to update ${story.id}: ${updateError.message}`);
    updatedStories += 1;
    console.log(`[story-images] migrated ${story.id}`);
  }

  console.log(`[story-images] done: ${updatedStories} story/stories, ${uploadedImages} image(s)`);
}

main().catch((error) => {
  console.error('[story-images] failed:', error.message);
  process.exit(1);
});
