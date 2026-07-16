import { createClient } from '@supabase/supabase-js';
import { Story } from '@/types';
import { unstable_noStore as noStore } from 'next/cache';
import { storeStoryImages } from './story-images';
import { stageForStoryLevel } from '@/lib/curriculum';

function getSupabaseReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase read credentials not configured');
  }

  return createClient(supabaseUrl, anonKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabasePublicReader() {
  try {
    return getSupabaseAdmin();
  } catch {
    return getSupabaseReadClient();
  }
}

export type StorySummary = Pick<
  Story,
  'id' | 'title_en' | 'title_vi' | 'level' | 'curriculum_stage_id' | 'topics' | 'cover_image' | 'estimated_minutes' | 'published' | 'premium_only'
>;

const STORY_SUMMARY_COLUMNS = 'id,title_en,title_vi,level,curriculum_stage_id,topics,cover_image,estimated_minutes,published,premium_only';
const LEGACY_STORY_SUMMARY_COLUMNS = 'id,title_en,title_vi,level,topics,cover_image,estimated_minutes,published,premium_only';

/** Hide full content of premium stories (list/cards still show cover + titles). */
export function redactPremiumStoryContent<T extends Story>(story: T): T {
  if (!story.premium_only) return story;
  return {
    ...story,
    panels: [],
    vocabulary: [],
    games: { match: [], fill_blank: [] },
  };
}

function sortFreeStoriesFirst<T extends { premium_only?: boolean }>(stories: T[]): T[] {
  // Free first, premium after. Stable within each group (caller order preserved).
  return [...stories].sort((a, b) => Number(Boolean(a.premium_only)) - Number(Boolean(b.premium_only)));
}

export async function listStories(): Promise<Story[]> {
  noStore();
  const supabase = getSupabasePublicReader();
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('published', true)
    .order('premium_only', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    // Older DBs without premium_only column: fall back + client-side sort.
    if (error.message?.includes('premium_only')) {
      const fallback = await supabase
        .from('stories')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (fallback.error) {
        throw new Error(`Failed to list stories: ${fallback.error.message}`);
      }
      return sortFreeStoriesFirst(((fallback.data || []) as Story[]).map(redactPremiumStoryContent));
    }
    throw new Error(`Failed to list stories: ${error.message}`);
  }

  // Public list must not leak premium panels/vocab to free users via JSON.
  return sortFreeStoriesFirst(((data || []) as Story[]).map(redactPremiumStoryContent));
}

export async function listStorySummaries(): Promise<StorySummary[]> {
  noStore();
  const supabase = getSupabasePublicReader();
  const result = await supabase
    .from('stories')
    .select(STORY_SUMMARY_COLUMNS)
    .eq('published', true)
    .order('premium_only', { ascending: true })
    .order('created_at', { ascending: false });
  let data: unknown[] | null = result.data as unknown[] | null;
  let error = result.error;

  if (error?.message?.includes('curriculum_stage_id') || error?.message?.includes('premium_only')) {
    const legacy = await supabase
      .from('stories')
      .select(LEGACY_STORY_SUMMARY_COLUMNS.includes('premium_only')
        ? 'id,title_en,title_vi,level,topics,cover_image,estimated_minutes,published'
        : LEGACY_STORY_SUMMARY_COLUMNS)
      .eq('published', true)
      .order('created_at', { ascending: false });
    data = legacy.data as unknown[] | null;
    error = legacy.error;
  }

  if (error) {
    throw new Error(`Failed to list story summaries: ${error.message}`);
  }

  return sortFreeStoriesFirst((data || []) as StorySummary[]);
}

export async function listStoriesAdmin(): Promise<Story[]> {
  noStore();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list stories: ${error.message}`);
  }

  return (data || []) as Story[];
}

export async function getStory(id: string, includeDraft = false): Promise<Story | null> {
  noStore();
  const supabase = includeDraft ? getSupabaseAdmin() : getSupabasePublicReader();
  let query = supabase
    .from('stories')
    .select('*')
    .eq('id', id);

  if (!includeDraft) {
    query = query.eq('published', true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch story: ${error.message}`);
  }

  return (data || null) as Story | null;
}

export async function createStory(story: Story): Promise<Story> {
  const supabase = getSupabaseAdmin();
  const storedStory = await storeStoryImages({
    ...story,
    curriculum_stage_id: story.curriculum_stage_id || stageForStoryLevel(story.level),
  });
  const { data, error } = await supabase
    .from('stories')
    .insert(storedStory)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create story: ${error?.message || 'Unknown error'}`);
  }

  return data as Story;
}

export async function updateStoryById(id: string, story: Story): Promise<Story> {
  const supabase = getSupabaseAdmin();
  const storedStory = await storeStoryImages({
    ...story,
    curriculum_stage_id: story.curriculum_stage_id || stageForStoryLevel(story.level),
  });
  const { data, error } = await supabase
    .from('stories')
    .update(storedStory)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update story: ${error?.message || 'Unknown error'}`);
  }

  return data as Story;
}

export async function deleteStoryById(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete story: ${error.message}`);
  }
}
