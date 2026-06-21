import { describe, it, expect } from 'vitest';
import { computeStoryStars } from './story-rewards';

describe('computeStoryStars', () => {
  it('gives a base of 1 star with no extra engagement', () => {
    expect(
      computeStoryStars({ panelsViewed: 1, totalPanels: 4, wordsClicked: 0 }),
    ).toBe(1);
  });

  it('adds +1 star when all panels are viewed', () => {
    expect(
      computeStoryStars({ panelsViewed: 4, totalPanels: 4, wordsClicked: 0 }),
    ).toBe(2);
  });

  it('adds +1 star when at least 3 distinct words are clicked', () => {
    expect(
      computeStoryStars({ panelsViewed: 1, totalPanels: 4, wordsClicked: 3 }),
    ).toBe(2);
  });

  it('grants 3 stars (clamped) for both all-panels and words>=3', () => {
    expect(
      computeStoryStars({ panelsViewed: 4, totalPanels: 4, wordsClicked: 5 }),
    ).toBe(3);
  });

  it('does not exceed 3 stars even with huge engagement', () => {
    expect(
      computeStoryStars({ panelsViewed: 100, totalPanels: 4, wordsClicked: 100 }),
    ).toBe(3);
  });

  it('does not grant the panel bonus when only some panels are viewed', () => {
    expect(
      computeStoryStars({ panelsViewed: 2, totalPanels: 4, wordsClicked: 1 }),
    ).toBe(1);
  });

  it('treats panelsViewed greater than totalPanels as all viewed', () => {
    expect(
      computeStoryStars({ panelsViewed: 6, totalPanels: 4, wordsClicked: 0 }),
    ).toBe(2);
  });

  it('is safe when totalPanels is zero (no panel bonus, base 1)', () => {
    expect(
      computeStoryStars({ panelsViewed: 0, totalPanels: 0, wordsClicked: 0 }),
    ).toBe(1);
    // Even with words clicked, an empty story tops out at base + words bonus.
    expect(
      computeStoryStars({ panelsViewed: 0, totalPanels: 0, wordsClicked: 3 }),
    ).toBe(2);
  });
});
