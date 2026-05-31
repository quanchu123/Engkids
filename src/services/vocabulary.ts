/**
 * Vocabulary Service
 * Manage user vocabulary with spaced repetition
 * Best practices: SM-2 algorithm for learning
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
export interface VocabularyItem {
  id: string;
  word: string;
  pronunciation?: string;
  meaningVi: string;
  meaningEn?: string;
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection' | 'other';
  exampleSentence?: string;
  exampleSentenceVi?: string;
  sourceType?: 'story' | 'video' | 'manual';
  sourceId?: string;
  reviewCount: number;
  correctCount: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastReviewedAt?: string;
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;
  isFavorite: boolean;
  createdAt: string;
}

export interface AddVocabularyInput {
  word: string;
  meaningVi: string;
  meaningEn?: string;
  partOfSpeech?: VocabularyItem['partOfSpeech'];
  exampleSentence?: string;
  exampleSentenceVi?: string;
  sourceType?: VocabularyItem['sourceType'];
  sourceId?: string;
  pronunciation?: string;
}

export interface ReviewResult {
  vocabularyId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // 0-2 = fail, 3-5 = pass
}

// SM-2 Algorithm Implementation (client-side)
function calculateNextReview(easeFactor: number, interval: number, quality: number) {
  const minEase = 1.3;
  
  // Calculate new ease factor
  let newEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEase < minEase) newEase = minEase;
  
  // Calculate new interval
  let newInterval: number;
  if (quality < 3) {
    // Failed: reset
    newInterval = 1;
  } else if (interval === 1) {
    newInterval = 1;
  } else if (interval <= 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEase);
  }
  
  return { newEase, newInterval };
}

// Calculate mastery level based on stats
function calculateMasteryLevel(reviewCount: number, correctCount: number, interval: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (reviewCount === 0) return 0; // New
  
  const accuracy = correctCount / reviewCount;
  
  if (interval >= 30 && accuracy >= 0.9) return 5; // Mastered
  if (interval >= 14 && accuracy >= 0.8) return 4; // Known
  if (interval >= 7 && accuracy >= 0.7) return 3; // Familiar
  if (reviewCount >= 3) return 2; // Reviewing
  return 1; // Learning
}

/**
 * Get user profile ID from auth
 */
async function getUserProfileId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  
  return data?.id || null;
}

/**
 * Add a new word to vocabulary
 */
export async function addVocabulary(input: AddVocabularyInput): Promise<VocabularyItem | null> {
  const profileId = await getUserProfileId();
  if (!profileId) {
    console.error('User not authenticated');
    return null;
  }
  
  const { data, error } = await supabase
    .from('vocabulary_items')
    .upsert({
      user_profile_id: profileId,
      word: input.word,
      pronunciation: input.pronunciation,
      meaning_vi: input.meaningVi,
      meaning_en: input.meaningEn,
      part_of_speech: input.partOfSpeech,
      example_sentence: input.exampleSentence,
      example_sentence_vi: input.exampleSentenceVi,
      source_type: input.sourceType,
      source_id: input.sourceId,
    }, {
      onConflict: 'user_profile_id,word_lower'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding vocabulary:', error);
    return null;
  }
  
  return mapDbToVocab(data);
}

/**
 * Remove word from vocabulary
 */
export async function removeVocabulary(vocabularyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('vocabulary_items')
    .delete()
    .eq('id', vocabularyId);
  
  if (error) {
    console.error('Error removing vocabulary:', error);
    return false;
  }
  
  return true;
}

/**
 * Get all user vocabulary
 */
export async function getAllVocabulary(options?: {
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'alphabetical' | 'mastery' | 'nextReview';
  filterMastery?: number[];
  favoritesOnly?: boolean;
}): Promise<VocabularyItem[]> {
  const profileId = await getUserProfileId();
  if (!profileId) return [];
  
  let query = supabase
    .from('vocabulary_items')
    .select('*')
    .eq('user_profile_id', profileId);
  
  // Apply filters
  if (options?.filterMastery && options.filterMastery.length > 0) {
    query = query.in('mastery_level', options.filterMastery);
  }
  
  if (options?.favoritesOnly) {
    query = query.eq('is_favorite', true);
  }
  
  // Apply sorting
  switch (options?.sortBy) {
    case 'alphabetical':
      query = query.order('word_lower', { ascending: true });
      break;
    case 'mastery':
      query = query.order('mastery_level', { ascending: true });
      break;
    case 'nextReview':
      query = query.order('next_review_date', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }
  
  // Apply pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching vocabulary:', error);
    throw new Error('Failed to fetch vocabulary');
  }

  return data.map(mapDbToVocab);
}

/**
 * Get words due for review (for flashcard practice)
 */
export async function getWordsForReview(limit: number = 20): Promise<VocabularyItem[]> {
  const profileId = await getUserProfileId();
  if (!profileId) return [];
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('vocabulary_items')
    .select('*')
    .eq('user_profile_id', profileId)
    .lte('next_review_date', today)
    .order('mastery_level', { ascending: true }) // New words first
    .order('next_review_date', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching review words:', error);
    throw new Error('Failed to fetch review words');
  }
  
  return data.map(mapDbToVocab);
}

/**
 * Submit review result for a word
 */
export async function submitReview(vocabularyId: string, quality: 0 | 1 | 2 | 3 | 4 | 5): Promise<VocabularyItem | null> {
  // Get current word data
  const { data: current, error: fetchError } = await supabase
    .from('vocabulary_items')
    .select('*')
    .eq('id', vocabularyId)
    .single();
  
  if (fetchError || !current) {
    console.error('Error fetching vocabulary:', fetchError);
    return null;
  }
  
  // Calculate new values
  const { newEase, newInterval } = calculateNextReview(
    current.ease_factor,
    current.interval_days,
    quality
  );
  
  const newReviewCount = current.review_count + 1;
  const newCorrectCount = current.correct_count + (quality >= 3 ? 1 : 0);
  const newMastery = calculateMasteryLevel(newReviewCount, newCorrectCount, newInterval);
  
  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);
  
  // Update
  const { data, error } = await supabase
    .from('vocabulary_items')
    .update({
      ease_factor: newEase,
      interval_days: newInterval,
      review_count: newReviewCount,
      correct_count: newCorrectCount,
      mastery_level: newMastery,
      next_review_date: nextDate.toISOString().split('T')[0],
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', vocabularyId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating review:', error);
    return null;
  }
  
  return mapDbToVocab(data);
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(vocabularyId: string): Promise<boolean> {
  const { data: current } = await supabase
    .from('vocabulary_items')
    .select('is_favorite')
    .eq('id', vocabularyId)
    .single();
  
  const { error } = await supabase
    .from('vocabulary_items')
    .update({ is_favorite: !current?.is_favorite })
    .eq('id', vocabularyId);
  
  return !error;
}

/**
 * Get vocabulary statistics
 */
export async function getVocabularyStats(): Promise<{
  total: number;
  byMastery: Record<number, number>;
  dueToday: number;
  favorites: number;
  accuracy: number;
}> {
  const profileId = await getUserProfileId();
  if (!profileId) {
    return { total: 0, byMastery: {}, dueToday: 0, favorites: 0, accuracy: 0 };
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('vocabulary_items')
    .select('mastery_level, is_favorite, next_review_date, review_count, correct_count')
    .eq('user_profile_id', profileId);
  
  if (error || !data) {
    return { total: 0, byMastery: {}, dueToday: 0, favorites: 0, accuracy: 0 };
  }
  
  const byMastery: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let dueToday = 0;
  let favorites = 0;
  let totalReviews = 0;
  let totalCorrect = 0;
  
  data.forEach(item => {
    byMastery[item.mastery_level] = (byMastery[item.mastery_level] || 0) + 1;
    if (item.next_review_date <= today) dueToday++;
    if (item.is_favorite) favorites++;
    totalReviews += item.review_count;
    totalCorrect += item.correct_count;
  });
  
  return {
    total: data.length,
    byMastery,
    dueToday,
    favorites,
    accuracy: totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0,
  };
}

/**
 * Sanitize search query to prevent PostgREST injection
 */
function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .slice(0, 100)
    .replace(/[%_(),."'\\]/g, '');
}

/**
 * Search vocabulary
 */
export async function searchVocabulary(query: string): Promise<VocabularyItem[]> {
  const profileId = await getUserProfileId();
  if (!profileId) return [];

  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return [];

  const { data, error } = await supabase
    .from('vocabulary_items')
    .select('*')
    .eq('user_profile_id', profileId)
    .or(`word.ilike.%${sanitized}%,meaning_vi.ilike.%${sanitized}%`)
    .limit(20);
  
  if (error) {
    console.error('Error searching vocabulary:', error);
    throw new Error('Failed to search vocabulary');
  }
  
  return data.map(mapDbToVocab);
}

// Helper: Map database row to VocabularyItem
interface VocabularyRow {
  id: string;
  word: string;
  pronunciation: string | null;
  meaning_vi: string;
  meaning_en: string | null;
  part_of_speech: string | null;
  example_sentence: string | null;
  example_sentence_vi: string | null;
  source_type: string | null;
  source_id: string | null;
  review_count: number;
  correct_count: number;
  ease_factor: number;
  interval_days: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  mastery_level: 0 | 1 | 2 | 3 | 4 | 5;
  is_favorite: boolean;
  created_at: string;
}

function mapDbToVocab(row: VocabularyRow): VocabularyItem {
  return {
    id: row.id,
    word: row.word,
    pronunciation: row.pronunciation ?? undefined,
    meaningVi: row.meaning_vi,
    meaningEn: row.meaning_en ?? undefined,
    partOfSpeech: row.part_of_speech as VocabularyItem['partOfSpeech'],
    exampleSentence: row.example_sentence ?? undefined,
    exampleSentenceVi: row.example_sentence_vi ?? undefined,
    sourceType: row.source_type as VocabularyItem['sourceType'],
    sourceId: row.source_id ?? undefined,
    reviewCount: row.review_count,
    correctCount: row.correct_count,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    nextReviewDate: row.next_review_date,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    masteryLevel: row.mastery_level,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  };
}

// Mastery level labels
export const MASTERY_LABELS = {
  0: { label: 'Mới', color: 'gray', emoji: '' },
  1: { label: 'Đang học', color: 'red', emoji: '' },
  2: { label: 'Ôn tập', color: 'orange', emoji: '' },
  3: { label: 'Quen thuộc', color: 'yellow', emoji: '' },
  4: { label: 'Nhớ rõ', color: 'blue', emoji: '' },
  5: { label: 'Thành thạo', color: 'green', emoji: '' },
};
