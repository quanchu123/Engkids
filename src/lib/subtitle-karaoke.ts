/**
 * Subtitle karaoke helper — pure timing math for highlighting the word that is
 * (approximately) being spoken in a subtitle cue. No React, no DOM.
 *
 * Real per-word timing is rarely available, so we estimate it: the cue's total
 * duration is distributed across the words in proportion to each word's
 * character length (longer words take longer to say). Given the current
 * playback time we return the index of the active word.
 */

/** Split a caption into word tokens (runs of non-whitespace). */
export function splitWords(text: string): string[] {
  if (!text) return [];
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Index of the word being spoken at `currentTime`, or -1 when:
 *  - the text is empty, or
 *  - currentTime is outside [cueStart, cueEnd], or
 *  - the cue has no positive duration.
 *
 * Duration is shared between words proportionally to character length.
 */
export function getActiveWordIndex(
  text: string,
  cueStart: number,
  cueEnd: number,
  currentTime: number,
): number {
  const words = splitWords(text);
  if (words.length === 0) return -1;

  const duration = cueEnd - cueStart;
  if (!(duration > 0)) return -1;

  if (currentTime < cueStart || currentTime > cueEnd) return -1;

  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  if (totalChars <= 0) return -1;

  const elapsed = currentTime - cueStart;
  let acc = 0;

  for (let i = 0; i < words.length; i++) {
    const slice = (words[i].length / totalChars) * duration;
    acc += slice;
    if (elapsed < acc) return i;
  }

  // Floating-point edge at the very end -> last word.
  return words.length - 1;
}
