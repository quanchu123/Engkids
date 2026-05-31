// Video Data Service - Supabase based
import { createClient } from '@supabase/supabase-js';
import { Video, SubtitleCue, VideoQuizQuestion } from '@/types';
import { getSignedThumbnailUrl } from './bunny';
import { getVideoPublicUrl } from './storage';
import { normalizeStoredVideoStatus } from '@/lib/video-status';

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
  
  return createClient(supabaseUrl, serviceRoleKey);
}

// Client-side Supabase (read-only with anon key)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, anonKey);
}

// Database row types
interface VideoRow {
  id: string;
  title: string;
  title_vi: string;
  description: string | null;
  thumbnail_url: string | null;
  bunny_video_id: string;
  hls_url: string | null;
  dash_url: string | null;
  duration: number;
  level: 'Beginner' | 'Elementary' | 'Intermediate';
  topics: string[];
  age_group: '3-5' | '6-8' | '9-12' | null;
  category: 'video' | 'music';
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
 * Convert DB row to Video type
 */
function rowToVideo(row: VideoRow, subtitles: SubtitleRow[] = []): Video {
  const normalizedStatus = normalizeStoredVideoStatus({
    status: row.status,
    hlsUrl: row.hls_url,
    dashUrl: row.dash_url,
  });

  // Self-hosted videos (no Bunny):
  //  - "local-" : file under /uploads on the server's disk (offline/DigitalOcean)
  //  - "storage-": file in Supabase Storage (works on Vercel too)
  // In both cases hls_url holds the reference (local path or storage path).
  const isStorage = row.bunny_video_id?.startsWith('storage-');
  const isLocalDisk = row.bunny_video_id?.startsWith('local-') || row.hls_url?.startsWith('/uploads/');
  const isSelfHosted = isStorage || isLocalDisk;

  // Resolve the playable URL for self-hosted videos.
  let selfHostedUrl: string | undefined;
  if (isStorage && row.hls_url) {
    try {
      // hls_url stores the storage object path; convert to a public URL.
      selfHostedUrl = row.hls_url.startsWith('http') ? row.hls_url : getVideoPublicUrl(row.hls_url);
    } catch {
      selfHostedUrl = row.hls_url || undefined;
    }
  } else if (isLocalDisk) {
    selfHostedUrl = row.hls_url || undefined;
  }

  // Generate signed thumbnail URL if video is ready (Bunny only)
  let thumbnailUrl = row.thumbnail_url || undefined;
  if (!isSelfHosted && normalizedStatus === 'ready' && row.bunny_video_id) {
    try {
      thumbnailUrl = getSignedThumbnailUrl(row.bunny_video_id);
    } catch (error) {
      // Fallback to DB URL if signing fails
      console.warn('Failed to generate signed thumbnail URL:', error);
    }
  }

  return {
    id: row.id,
    title: row.title,
    titleVi: row.title_vi,
    description: row.description || undefined,
    thumbnailUrl,
    bunnyVideoId: row.bunny_video_id,
    sourceType: isSelfHosted ? 'local' : undefined,
    externalUrl: isSelfHosted ? selfHostedUrl : undefined,
    hlsUrl: row.hls_url || undefined,
    dashUrl: row.dash_url || undefined,
    duration: row.duration,
    level: row.level,
    topics: row.topics,
    ageGroup: row.age_group || undefined,
    category: row.category,
    status: normalizedStatus,
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
  const supabase = getSupabaseClient();

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
 * Used in admin panel to monitor upload/processing progress
 */
export async function getAllVideosAdmin(): Promise<Video[]> {
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
export async function getVideoById(id: string): Promise<Video | null> {
  const supabase = getSupabaseClient();
  
  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();
  
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
 * Create new video (admin only, server-side)
 */
export async function createVideo(data: {
  title: string;
  titleVi: string;
  bunnyVideoId: string;
  description?: string;
  level?: Video['level'];
  topics?: string[];
  ageGroup?: Video['ageGroup'];
  category?: 'video' | 'music';
}): Promise<Video> {
  const supabase = getSupabaseAdmin();
  
  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      title: data.title,
      title_vi: data.titleVi,
      bunny_video_id: data.bunnyVideoId,
      description: data.description || null,
      level: data.level || 'Beginner',
      topics: data.topics || [],
      age_group: data.ageGroup || null,
      category: data.category || 'video',
      status: 'uploading',
    })
    .select()
    .single();
  
  if (error || !video) {
    throw new Error(`Failed to create video: ${error?.message}`);
  }
  
  return rowToVideo(video);
}

/**
 * Create a new locally-hosted video (admin only, server-side).
 * Used when there is no Bunny.net (offline / testing). The uploaded file path
 * (under /uploads) is stored in hls_url and the video is immediately "ready".
 */
export async function createLocalVideo(data: {
  title: string;
  titleVi: string;
  filePath: string;        // public path, e.g. /uploads/abc.mp4
  description?: string;
  level?: Video['level'];
  topics?: string[];
  ageGroup?: Video['ageGroup'];
  category?: 'video' | 'music';
}): Promise<Video> {
  const supabase = getSupabaseAdmin();

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      title: data.title,
      title_vi: data.titleVi,
      // Unique placeholder id so the NOT NULL/UNIQUE bunny_video_id constraint holds.
      bunny_video_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: data.description || null,
      level: data.level || 'Beginner',
      topics: data.topics || [],
      age_group: data.ageGroup || null,
      category: data.category || 'video',
      status: 'ready',
      hls_url: data.filePath,
    })
    .select()
    .single();

  if (error || !video) {
    throw new Error(`Failed to create local video: ${error?.message}`);
  }

  return rowToVideo(video);
}

/**
 * Create a video backed by Supabase Storage (admin only, server-side).
 * The browser uploads the file directly to Storage; this just records the
 * metadata + storage path. Works on Vercel (no server filesystem needed).
 */
export async function createStorageVideo(data: {
  title: string;
  titleVi: string;
  storagePath: string;     // object path inside the videos bucket
  description?: string;
  level?: Video['level'];
  topics?: string[];
  ageGroup?: Video['ageGroup'];
  category?: 'video' | 'music';
}): Promise<Video> {
  const supabase = getSupabaseAdmin();

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      title: data.title,
      title_vi: data.titleVi,
      bunny_video_id: `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: data.description || null,
      level: data.level || 'Beginner',
      topics: data.topics || [],
      age_group: data.ageGroup || null,
      category: data.category || 'video',
      status: 'ready',
      hls_url: data.storagePath,
    })
    .select()
    .single();

  if (error || !video) {
    throw new Error(`Failed to create storage video: ${error?.message}`);
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
    hlsUrl: string;
    dashUrl: string;
    duration: number;
    level: Video['level'];
    topics: string[];
    ageGroup: Video['ageGroup'];
    status: Video['status'];
    quiz: VideoQuizQuestion[];
  }>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.titleVi) dbUpdates.title_vi = updates.titleVi;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
  if (updates.hlsUrl !== undefined) dbUpdates.hls_url = updates.hlsUrl;
  if (updates.dashUrl !== undefined) dbUpdates.dash_url = updates.dashUrl;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.level) dbUpdates.level = updates.level;
  if (updates.topics) dbUpdates.topics = updates.topics;
  if (updates.ageGroup !== undefined) dbUpdates.age_group = updates.ageGroup;
  if (updates.status) dbUpdates.status = updates.status;
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
    .eq('status', 'ready')
    .eq('level', level);
  
  if (error) {
    if (!isNetworkError(error)) console.error('Error fetching videos by level:', error);
    return [];
  }
  
  return videos.map(v => rowToVideo(v));
}
