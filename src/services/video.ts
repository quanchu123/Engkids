// Video Data Service - Supabase metadata + DigitalOcean Spaces files
import { createClient } from '@supabase/supabase-js';
import { Video, SubtitleCue, VideoQuizQuestion } from '@/types';
import { getVideoPublicUrl } from './storage';
import { unstable_noStore as noStore } from 'next/cache';
import { stageForStoryLevel } from '@/lib/curriculum';

// Track if we've already warned about Supabase being unavailable to avoid log spam
let supabaseUnavailableWarned = false;

function isNetworkError(error: { code?: string; message?: string }): boolean {
  const msg = error?.message || '';
  return (
    msg.includes('fetch failed') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ConnectTimeout') ||
    msg.includes('connect timeout')
  );
}

// Server-side Supabase client (uses service role for admin operations)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

// Client-side Supabase (read-only with anon key)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, anonKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabasePublicReader() {
  try {
    return getSupabaseAdmin();
  } catch {
    return getSupabaseClient();
  }
}

// Database row types
interface VideoRow {
  id: string;
  title: string;
  title_vi: string;
  description: string | null;
  thumbnail_url: string | null;
  object_key: string | null;
  duration: number;
  level: 'Beginner' | 'Elementary' | 'Intermediate';
  curriculum_stage_id: string | null;
  topics: string[];
  age_group: '3-5' | '6-8' | '9-12' | null;
  category: 'video' | 'music';
  feature: string | null;
  status: string;
  quiz: VideoQuizQuestion[] | null;
  created_at: string;
  updated_at: string;
}

interface SubtitleRow {
  id: string;
  video_id: string;
  cue_index: number;
  start_time: number;
  end_time: number;
  text_en: string;
  text_vi: string;
}

/**
 * Sanitize quiz questions loaded from the DB into a safe, well-formed array.
 */
function normalizeQuiz(raw: unknown): VideoQuizQuestion[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index): VideoQuizQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const q = item as Record<string, unknown>;

      const options = Array.isArray(q.options)
        ? q.options.filter((o): o is string => typeof o === 'string')
        : [];
      const question = typeof q.question === 'string' ? q.question : '';

      if (!question || options.length < 2) return null;

      const correctIndexRaw = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
      const correctIndex = Math.min(Math.max(0, correctIndexRaw), options.length - 1);

      return {
        id: typeof q.id === 'string' ? q.id : `quiz-${index}`,
        question,
        questionVi: typeof q.questionVi === 'string' ? q.questionVi : undefined,
        options,
        correctIndex,
        explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
        timeCode: typeof q.timeCode === 'number' ? q.timeCode : undefined,
      };
    })
    .filter((q): q is VideoQuizQuestion => q !== null);
}

/**
 * Convert DB row to Video type. Resolves the public CDN URL from the object key.
 */
function rowToVideo(row: VideoRow, subtitles: SubtitleRow[] = []): Video {
  // A video is playable when it has a status of ready and an object key.
  const status: Video['status'] =
    row.status === 'ready' ||
    row.status === 'error' ||
    row.status === 'uploading' ||
    row.status === 'processing'
      ? (row.status as Video['status'])
      : 'processing';

  // Resolve the playable URL for the stored object.
  let videoUrl: string | undefined;
  if (row.object_key) {
    try {
      videoUrl = getVideoPublicUrl(row.object_key);
    } catch {
      videoUrl = undefined;
    }
  }

  return {
    id: row.id,
    title: row.title,
    titleVi: row.title_vi,
    description: row.description || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    objectKey: row.object_key || undefined,
    videoUrl,
    duration: Number.isFinite(row.duration) ? Math.max(0, Math.round(row.duration)) : 0,
    level: row.level,
    curriculum_stage_id: row.curriculum_stage_id,
    topics: row.topics,
    ageGroup: row.age_group || undefined,
    category: row.category,
    feature: row.feature || undefined,
    status,
    subtitles: subtitles
      .sort((a, b) => a.cue_index - b.cue_index)
      .map(s => ({
        id: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        textEn: s.text_en,
        textVi: s.text_vi,
      })),
    quiz: normalizeQuiz(row.quiz),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all videos (public, read-only)
 * Only returns videos with status='ready' (successfully processed)
 * Optionally filter by category at the database level
 */
export async function getAllVideos(category?: 'video' | 'music'): Promise<Video[]> {
  noStore();
  // Server-side public reads use service role and enforce public filters here.
  // This keeps the homepage/catalog stable even if Supabase RLS policies change.
  const supabase = getSupabasePublicReader();

  let query = supabase
    .from('videos')
    .select('*')
    .is('deleted_at', null);

  if (category) {
    query = query.eq('category', category);
  }

  const { data: videos, error } = await query.order('created_at', { ascending: false });

  if (error) {
    if (isNetworkError(error)) {
      if (!supabaseUnavailableWarned) {
        console.warn('[Supabase] Database unreachable — check your project at supabase.com (project may be paused).');
        supabaseUnavailableWarned = true;
      }
    } else {
      console.error('Error fetching videos:', error);
    }
    return [];
  }

  supabaseUnavailableWarned = false; // reset on success
  return videos
    .map(v => rowToVideo(v, []))
    .filter(v => v.status === 'ready');
}

/**
 * Get all videos for admin (includes all statuses)
 * Used in admin panel to monitor upload progress
 */
export async function getAllVideosAdmin(): Promise<Video[]> {
  noStore();
  const supabase = getSupabaseAdmin();

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    if (isNetworkError(error)) {
      if (!supabaseUnavailableWarned) {
        console.warn('[Supabase] Database unreachable — check your project at supabase.com (project may be paused).');
        supabaseUnavailableWarned = true;
      }
    } else {
      console.error('Error fetching admin videos:', error);
    }
    return [];
  }

  return videos.map(v => rowToVideo(v, []));
}

/**
 * Get video by ID with subtitles
 */
export async function getVideoById(id: string, includeUnavailable = false): Promise<Video | null> {
  noStore();
  const supabase = includeUnavailable ? getSupabaseAdmin() : getSupabasePublicReader();

  let query = supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null);

  if (!includeUnavailable) {
    query = query.eq('status', 'ready');
  }

  const { data: video, error } = await query.single();

  if (error || !video) {
    return null;
  }

  const { data: subtitles } = await supabase
    .from('video_subtitles')
    .select('*')
    .eq('video_id', id)
    .order('cue_index', { ascending: true });

  return rowToVideo(video, subtitles || []);
}

/**
 * Create a video backed by the droplet's local disk (admin only, server-side).
 * The browser streams the file to /api/videos/upload which returns an object
 * key; this records the metadata + object key and marks the video as ready.
 */
export async function createVideo(data: {
  title: string;
  titleVi: string;
  objectKey: string;       // file name stored under public/uploads
  description?: string;
  thumbnailUrl?: string;
    level?: Video['level'];
    curriculumStageId?: string;
  topics?: string[];
  ageGroup?: Video['ageGroup'];
  category?: 'video' | 'music';
  feature?: string;
  duration?: number;
}): Promise<Video> {
  const supabase = getSupabaseAdmin();

  if (!data.title?.trim() || !data.titleVi?.trim()) {
    throw new Error('Title (English) and Title (Vietnamese) are required');
  }

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      title: data.title,
      title_vi: data.titleVi,
      object_key: data.objectKey,
      description: data.description || null,
      thumbnail_url: data.thumbnailUrl || null,
      level: data.level || 'Beginner',
      curriculum_stage_id: data.curriculumStageId || stageForStoryLevel(data.level || 'Beginner'),
      topics: data.topics || [],
      age_group: data.ageGroup || null,
      category: data.category || 'video',
      feature: data.feature?.trim() || null,
      duration: data.duration || 0,
      status: 'ready',
    })
    .select()
    .single();

  if (error || !video) {
    throw new Error(`Failed to create video: ${error?.message}`);
  }

  return rowToVideo(video);
}

/**
 * Update video (admin only, server-side)
 */
export async function updateVideo(
  id: string,
  updates: Partial<{
    title: string;
    titleVi: string;
    description: string;
    thumbnailUrl: string;
    objectKey: string;
    duration: number;
    level: Video['level'];
    curriculumStageId: string;
    topics: string[];
    ageGroup: Video['ageGroup'];
    status: Video['status'];
    category: 'video' | 'music';
    feature: string;
    quiz: VideoQuizQuestion[];
  }>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.titleVi) dbUpdates.title_vi = updates.titleVi;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
  if (updates.objectKey !== undefined) dbUpdates.object_key = updates.objectKey;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.level) dbUpdates.level = updates.level;
  if (updates.curriculumStageId !== undefined) dbUpdates.curriculum_stage_id = updates.curriculumStageId || null;
  else if (updates.level) dbUpdates.curriculum_stage_id = stageForStoryLevel(updates.level);
  if (updates.topics) dbUpdates.topics = updates.topics;
  if (updates.ageGroup !== undefined) dbUpdates.age_group = updates.ageGroup;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.feature !== undefined) dbUpdates.feature = updates.feature.trim() || null;
  if (updates.quiz !== undefined) dbUpdates.quiz = updates.quiz;

  const { error } = await supabase
    .from('videos')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update video: ${error.message}`);
  }
}

/**
 * Delete video (admin only, server-side)
 */
export async function deleteVideo(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error: subtitlesError } = await supabase
    .from('video_subtitles')
    .delete()
    .eq('video_id', id);

  if (subtitlesError) {
    throw new Error(`Failed to delete video subtitles: ${subtitlesError.message}`);
  }

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

/**
 * Save subtitles for a video (admin only, server-side)
 */
export async function saveVideoSubtitles(
  videoId: string,
  subtitles: SubtitleCue[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Delete existing subtitles
  await supabase
    .from('video_subtitles')
    .delete()
    .eq('video_id', videoId);

  // Insert new subtitles
  if (subtitles.length > 0) {
    const rows = subtitles.map((cue, index) => ({
      video_id: videoId,
      cue_index: index,
      start_time: cue.startTime,
      end_time: cue.endTime,
      text_en: cue.textEn,
      text_vi: cue.textVi || '',
    }));

    const { error } = await supabase
      .from('video_subtitles')
      .insert(rows);

    if (error) {
      throw new Error(`Failed to save subtitles: ${error.message}`);
    }
  }
}

/**
 * Get videos by topic
 */
export async function getVideosByTopic(topic: string): Promise<Video[]> {
  const supabase = getSupabaseClient();

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .is('deleted_at', null)
    .eq('status', 'ready')
    .contains('topics', [topic]);

  if (error) {
    if (!isNetworkError(error)) console.error('Error fetching videos by topic:', error);
    return [];
  }

  return videos.map(v => rowToVideo(v));
}

/**
 * Get videos by level
 */
export async function getVideosByLevel(level: Video['level']): Promise<Video[]> {
  const supabase = getSupabaseClient();

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .is('deleted_at', null)
    .eq('status', 'ready')
    .eq('level', level);

  if (error) {
    if (!isNetworkError(error)) console.error('Error fetching videos by level:', error);
    return [];
  }

  return videos.map(v => rowToVideo(v));
}
