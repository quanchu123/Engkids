'use client';

import { getSupabaseClient } from '@/lib/auth-client';
import { ProgressSnapshot, SavedWord, StoryProgress, GameScore, UserSettings, DailyQuestState, BadgeProgress } from '@/types';
import { DEFAULT_SETTINGS, getTodayDate, normalizeProgressSnapshot } from '@/lib/progress';

interface UserProfileRow {
  id: string;
  auth_id: string | null;
  email: string | null;
}

interface UserProgressRow {
  user_profile_id: string;
  total_stars: number | null;
  current_streak: number | null;
  last_activity_date: string | null;
  stories_progress: Record<string, StoryProgress> | null;
  game_scores: GameScore[] | null;
  settings: UserSettings | null;
  daily_quest_state: DailyQuestState | null;
  badges: BadgeProgress[] | null;
}

interface VocabularyRow {
  word: string;
  meaning_vi: string;
  pronunciation: string | null;
  source_id: string | null;
  is_favorite: boolean | null;
  mastery_level: 0 | 1 | 2 | 3 | 4 | 5 | null;
  review_count: number | null;
  last_reviewed_at: string | null;
  example_sentence: string | null;
  created_at: string;
}

async function getAuthenticatedUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getOrCreateAuthProfileId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const db = supabase as any;
  const user = await getAuthenticatedUser();

  if (!user || !user.email) {
    return null;
  }

  const { data: existingByAuth } = await db
    .from('user_profiles')
    .select('id, auth_id, email')
    .eq('auth_id', user.id)
    .maybeSingle() as { data: UserProfileRow | null };

  if (existingByAuth?.id) {
    return existingByAuth.id;
  }

  const { data: existingByEmail } = await db
    .from('user_profiles')
    .select('id, auth_id, email')
    .eq('email', user.email)
    .is('auth_id', null)
    .limit(1)
    .maybeSingle() as { data: UserProfileRow | null };

  if (existingByEmail?.id) {
    const { data: updated } = await db
      .from('user_profiles')
      .update({
        auth_id: user.id,
        name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      })
      .eq('id', existingByEmail.id)
      .select('id')
      .single();

    return updated?.id || existingByEmail.id;
  }

  const { data: inserted, error } = await db
    .from('user_profiles')
    .insert({
      auth_id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create user profile:', error);
    return null;
  }

  return inserted?.id || null;
}

async function ensureUserProgressRow(profileId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const db = supabase as any;
  const { data: existing } = await db
    .from('user_progress')
    .select('user_profile_id')
    .eq('user_profile_id', profileId)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { error } = await db
    .from('user_progress')
    .insert({ user_profile_id: profileId });

  if (error) {
    console.error('Failed to create user progress row:', error);
  }
}

function mapVocabularyRows(rows: VocabularyRow[]): SavedWord[] {
  return rows.map((row) => ({
    word: row.word,
    vi: row.meaning_vi,
    ipa: row.pronunciation || '',
    savedAt: row.created_at,
    storyId: row.source_id || undefined,
    isFavorite: Boolean(row.is_favorite),
    masteryLevel: row.mastery_level ?? 0,
    reviewCount: row.review_count ?? 0,
    lastReviewedAt: row.last_reviewed_at || undefined,
    exampleSentence: row.example_sentence || undefined,
  }));
}

export async function loadRemoteProgressSnapshot(): Promise<ProgressSnapshot | null> {
  const supabase = getSupabaseClient();
  const db = supabase as any;
  const profileId = await getOrCreateAuthProfileId();

  if (!profileId) {
    return null;
  }

  await ensureUserProgressRow(profileId);

  const { data: progressRow, error: progressError } = await db
    .from('user_progress')
    .select('user_profile_id, total_stars, current_streak, last_activity_date, stories_progress, game_scores, settings, daily_quest_state, badges')
    .eq('user_profile_id', profileId)
    .single() as { data: UserProgressRow | null; error: { message: string } | null };

  if (progressError) {
    console.error('Failed to load remote progress:', progressError);
    return null;
  }

  const { data: vocabRows, error: vocabError } = await db
    .from('vocabulary_items')
    .select('word, meaning_vi, pronunciation, source_id, is_favorite, mastery_level, review_count, last_reviewed_at, example_sentence, created_at')
    .eq('user_profile_id', profileId)
    .order('created_at', { ascending: true }) as { data: VocabularyRow[] | null; error: { message: string } | null };

  if (vocabError) {
    console.error('Failed to load remote vocabulary:', vocabError);
    return null;
  }

  const remoteProgress: Partial<ProgressSnapshot['progress']> = {
  storiesProgress: progressRow?.stories_progress || {},
  savedWords: mapVocabularyRows(vocabRows || []),
  gameScores: progressRow?.game_scores || [],
  totalStars: progressRow?.total_stars || 0,
  currentStreak: progressRow?.current_streak || 0,
  lastActiveDate: progressRow?.last_activity_date || getTodayDate(),
  badges: progressRow?.badges || [],
};

if (progressRow?.daily_quest_state) {
  remoteProgress.dailyQuestState = progressRow.daily_quest_state;
}

return normalizeProgressSnapshot({
  progress: remoteProgress,
  settings: {
    ...DEFAULT_SETTINGS,
    ...(progressRow?.settings || {}),
  },
});
}

export async function saveRemoteProgressSnapshot(snapshot: ProgressSnapshot): Promise<void> {
  const supabase = getSupabaseClient();
  const db = supabase as any;
  const profileId = await getOrCreateAuthProfileId();

  if (!profileId) {
    return;
  }

  await ensureUserProgressRow(profileId);

  const normalized = normalizeProgressSnapshot(snapshot);

  const progressPayload = {
    user_profile_id: profileId,
    total_stars: normalized.progress.totalStars,
    current_streak: normalized.progress.currentStreak,
    last_activity_date: normalized.progress.lastActiveDate,
    stories_progress: normalized.progress.storiesProgress,
    game_scores: normalized.progress.gameScores,
    settings: normalized.settings,
    daily_quest_state: normalized.progress.dailyQuestState,
    badges: normalized.progress.badges,
    saved_words: normalized.progress.savedWords.map((word) => word.word),
  };

  const { error: progressError } = await db
    .from('user_progress')
    .upsert(progressPayload, { onConflict: 'user_profile_id' });

  if (progressError) {
    console.error('Failed to save remote progress:', progressError);
    return;
  }

  const words = normalized.progress.savedWords;
  const { data: existingWords } = await db
    .from('vocabulary_items')
    .select('word_lower')
    .eq('user_profile_id', profileId) as { data: Array<{ word_lower: string }> | null };

  const normalizedCurrentWords = new Set(words.map((word) => word.word.toLowerCase().trim()));
  const removableWords = (existingWords || [])
    .map((row) => row.word_lower)
    .filter((wordLower) => !normalizedCurrentWords.has(wordLower));

  if (words.length > 0) {
    const { error: vocabUpsertError } = await db
      .from('vocabulary_items')
      .upsert(
        words.map((word) => ({
          user_profile_id: profileId,
          word: word.word,
          pronunciation: word.ipa || null,
          meaning_vi: word.vi,
          example_sentence: word.exampleSentence || null,
          source_type: word.storyId ? 'story' : 'manual',
          source_id: word.storyId || null,
          mastery_level: word.masteryLevel ?? 0,
          is_favorite: Boolean(word.isFavorite),
          review_count: word.reviewCount ?? 0,
          last_reviewed_at: word.lastReviewedAt || null,
        })),
        { onConflict: 'user_profile_id,word_lower' },
      );

    if (vocabUpsertError) {
      console.error('Failed to save remote vocabulary:', vocabUpsertError);
    }
  }

  if (removableWords.length > 0) {
    const { error: deleteError } = await db
      .from('vocabulary_items')
      .delete()
      .eq('user_profile_id', profileId)
      .in('word_lower', removableWords);

    if (deleteError) {
      console.error('Failed to remove deleted vocabulary:', deleteError);
    }
  }
}






