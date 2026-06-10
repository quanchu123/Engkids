// ============================================
// SITE SETTINGS SERVICE
// ============================================
// Reads/writes global site settings (key/value JSON). First use: home-page
// background music.
import { existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { deleteVideoObject, getVideoPublicUrl, UPLOADS_DIR } from '@/services/storage';

const MUSIC_KEY = 'background_music';

export interface BackgroundMusic {
  enabled: boolean;
  objectKey: string | null;
  volume: number;        // 0..1
  url?: string;          // resolved public URL (read-only)
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase credentials not configured');
  return createClient(url, anonKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase credentials not configured');
  return createClient(url, serviceKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  });
}

function localObjectExists(objectKey: string): boolean {
  if (!objectKey || /^https?:\/\//i.test(objectKey)) return true;
  const name = objectKey.replace('/uploads/', '').replace(/^\/+/, '');
  return existsSync(path.join(UPLOADS_DIR, path.basename(name)));
}

async function fetchSetting(key: string): Promise<unknown | null> {
  try {
    const supabase = (() => {
      try {
        return getSupabaseAdmin();
      } catch {
        return getSupabaseClient();
      }
    })();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}

function normalizeMusic(raw: unknown): BackgroundMusic {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const objectKey = typeof obj.objectKey === 'string' && obj.objectKey ? obj.objectKey : null;
  let volume = typeof obj.volume === 'number' ? obj.volume : 0.4;
  if (volume < 0) volume = 0;
  if (volume > 1) volume = 1;
  const fileAvailable = objectKey ? localObjectExists(objectKey) : false;
  const enabled = Boolean(obj.enabled) && Boolean(objectKey) && fileAvailable;
  return {
    enabled,
    objectKey,
    volume,
    url: objectKey && fileAvailable ? getVideoPublicUrl(objectKey) : undefined,
  };
}

export async function getBackgroundMusic(): Promise<BackgroundMusic> {
  return normalizeMusic(await fetchSetting(MUSIC_KEY));
}

export async function saveBackgroundMusic(input: {
  enabled?: boolean;
  objectKey?: string | null;
  volume?: number;
}): Promise<BackgroundMusic> {
  const current = await getBackgroundMusic();
  const next: BackgroundMusic = normalizeMusic({
    enabled: input.enabled ?? current.enabled,
    objectKey: input.objectKey !== undefined ? input.objectKey : current.objectKey,
    volume: input.volume ?? current.volume,
  });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('site_settings').upsert({
    key: MUSIC_KEY,
    value: { enabled: next.enabled, objectKey: next.objectKey, volume: next.volume },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to save background music: ${error.message}`);

  if (
    current.objectKey &&
    current.objectKey !== next.objectKey &&
    !current.objectKey.startsWith('http')
  ) {
    await deleteVideoObject(current.objectKey).catch(() => {});
  }

  return next;
}
