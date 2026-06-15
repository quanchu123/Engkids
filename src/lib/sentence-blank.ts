// Pure helper for the "fill in the blank" exercise. Given a sentence and a set
// of target words (the vocabulary the lesson is teaching), find one target word
// that appears in the sentence and split the sentence around it so the renderer
// can show `before ___ after` with the answer hidden. Kept free of React/DOM so
// it can be unit-tested directly (Vitest, environment: node).

export interface BlankResult {
  before: string; // text before the blank (may be empty)
  blank: string; // the exact original token that was removed (for display width)
  after: string; // text after the blank (may be empty)
  answer: string; // the normalized word the child must supply
}

// Normalize a word for matching: lowercase, strip surrounding punctuation. So
// "School." and "school" match. Keeps internal apostrophes/hyphens ("don't").
function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, '')
    .trim();
}

// Find the first target word that occurs in the sentence and blank it out.
// Returns null when no target word is present (caller skips the blank exercise
// gracefully and falls back to a passive renderer). Prefers a target that is at
// least 3 characters so we don't blank trivial words like "a"/"to".
export function deriveBlank(sentence: string, targetWords: string[]): BlankResult | null {
  const text = sentence.trim();
  if (!text) return null;

  const targets = new Set(
    targetWords.map((w) => normalize(w)).filter((w) => w.length >= 3),
  );
  if (targets.size === 0) return null;

  // Split on whitespace but keep track of where each token sits so we can
  // reassemble before/after exactly (preserving original spacing-ish).
  const tokens = text.split(/(\s+)/); // keeps the whitespace chunks as tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^\s+$/.test(token) || token === '') continue;
    const key = normalize(token);
    if (key && targets.has(key)) {
      const before = tokens.slice(0, i).join('');
      const after = tokens.slice(i + 1).join('');
      return {
        before: before.trimEnd(),
        blank: token,
        after: after.trimStart(),
        answer: key,
      };
    }
  }

  return null;
}
