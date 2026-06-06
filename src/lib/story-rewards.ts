/**
 * Story reward logic — pure, testable star computation.
 *
 * Stars reflect how much the child engaged with a story rather than simply
 * reaching the end. Kept dependency-free so it can be unit tested in isolation.
 */

export interface StoryStarsInput {
  /** Number of distinct panels the child actually viewed. */
  panelsViewed: number;
  /** Total number of panels in the story. */
  totalPanels: number;
  /** Number of distinct words the child clicked to look up. */
  wordsClicked: number;
}

/**
 * Compute 1–3 stars from engagement signals.
 *
 * Rules:
 *  - Base: 1 star for completing the story at all.
 *  - +1 star if the child viewed every panel (panelsViewed >= totalPanels,
 *    and totalPanels > 0 so an empty story can't grant the bonus).
 *  - +1 star if the child clicked at least 3 distinct words.
 *
 * Result is clamped to the inclusive range [1, 3].
 */
export function computeStoryStars(input: StoryStarsInput): 1 | 2 | 3 {
  const { panelsViewed, totalPanels, wordsClicked } = input;

  let stars = 1;

  if (totalPanels > 0 && panelsViewed >= totalPanels) {
    stars += 1;
  }

  if (wordsClicked >= 3) {
    stars += 1;
  }

  // Clamp to [1, 3].
  if (stars > 3) stars = 3;
  if (stars < 1) stars = 1;

  return stars as 1 | 2 | 3;
}
