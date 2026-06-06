/**
 * Pronunciation scoring — pure, DOM-free, unit-testable.
 *
 * Compares what a learner *said* (the speech-recognition transcript) against a
 * *target* English word/phrase and produces a friendly 0..100 score. Kept free
 * of any browser/DOM access so it can be unit-tested in isolation and reused on
 * either client or server.
 *
 * Scoring is based on a normalized Levenshtein (edit-distance) similarity:
 *   similarity = 1 - distance / maxLen   →   score = round(similarity * 100)
 *
 * For multi-word targets we also try matching the target against the single
 * best-matching token in the heard text, so prompts like "say carrot" still
 * score well when the kid only says "carrot". The final score is the best of
 * the whole-phrase similarity and the best single-token similarity.
 */

/** Score (inclusive) at or above which a pronunciation counts as "correct". */
export const PASS_THRESHOLD = 80;

export interface PronunciationScore {
  /** 0..100 similarity score. */
  score: number;
  /** True when score >= PASS_THRESHOLD. */
  correct: boolean;
  /** True when the normalized strings are an exact match (score === 100). */
  matched: boolean;
}

/**
 * Normalize a spoken/target string for comparison:
 * lowercase, trim, strip punctuation, collapse internal whitespace.
 */
export function normalizeSpoken(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .trim()
    // Replace any character that is not a letter, number or whitespace with a
    // space. Uses Unicode-aware classes so accented characters survive.
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein edit distance between two strings (iterative, O(n*m) time,
 * O(min(n,m)) space). Pure and never throws.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Keep the shorter string as the inner (column) dimension to save memory.
  let s = a;
  let t = b;
  if (s.length > t.length) {
    const tmp = s;
    s = t;
    t = tmp;
  }

  const prev: number[] = new Array(s.length + 1);
  for (let i = 0; i <= s.length; i++) prev[i] = i;

  for (let j = 1; j <= t.length; j++) {
    let diag = prev[0]; // prev[i-1] before it is overwritten
    prev[0] = j;
    for (let i = 1; i <= s.length; i++) {
      const temp = prev[i];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      prev[i] = Math.min(
        prev[i] + 1, // deletion
        prev[i - 1] + 1, // insertion
        diag + cost // substitution
      );
      diag = temp;
    }
  }

  return prev[s.length];
}

/**
 * Normalized similarity in [0, 1] between two already-normalized strings.
 * Two empty strings are treated as fully similar (1).
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * Score how closely `heard` matches `target`.
 *
 * Never throws. An empty/whitespace-only `heard` yields a score of 0.
 * An exact normalized match always yields 100.
 */
export function scorePronunciation(target: string, heard: string): PronunciationScore {
  const normTarget = normalizeSpoken(target ?? '');
  const normHeard = normalizeSpoken(heard ?? '');

  // Nothing meaningful to score against.
  if (normHeard.length === 0 || normTarget.length === 0) {
    return { score: 0, correct: false, matched: false };
  }

  // Exact normalized match → perfect.
  if (normTarget === normHeard) {
    return { score: 100, correct: true, matched: true };
  }

  // Whole-phrase similarity.
  let best = similarity(normTarget, normHeard);

  // Token-in-phrase: compare the target against each spoken token and keep the
  // best. Helps a single-word target like "carrot" still score high when the
  // kid says it inside a longer phrase (e.g. heard "say carrot").
  const heardTokens = normHeard.split(' ');
  for (const token of heardTokens) {
    if (!token) continue;
    const sim = similarity(normTarget, token);
    if (sim > best) best = sim;
  }

  const score = Math.round(best * 100);
  return {
    score,
    correct: score >= PASS_THRESHOLD,
    matched: false,
  };
}
