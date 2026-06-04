import { createClient } from '@supabase/supabase-js';
import { Story } from '@/types';
import { unstable_noStore as noStore } from 'next/cache';

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

export async function listStories(): Promise<Story[]> {
  noStore();
  const supabase = getSupabasePublicReader();
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list stories: ${error.message}`);
  }

  return (data || []) as Story[];
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
  const { data, error } = await supabase
    .from('stories')
    .insert(story)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create story: ${error?.message || 'Unknown error'}`);
  }

  return data as Story;
}

export async function updateStoryById(id: string, story: Story): Promise<Story> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('stories')
    .update(story)
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
