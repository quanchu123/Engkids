import { describe, it, expect } from 'vitest';
import { DailyQuestState, DailyQuestStepType } from '@/types';
import { buildLessonPath, getLessonSummary, LessonStep } from '@/lib/learning-path';

function makeQuest(done: Partial<Record<DailyQuestStepType, boolean>> = {}): DailyQuestState {
  const step = (type: DailyQuestStepType) => ({
    type,
    target: 1,
    completed: done[type] ? 1 : 0,
    done: Boolean(done[type]),
  });

  return {
    date: '2024-01-01',
    steps: {
      story: step('story'),
      media: step('media'),
      game: step('game'),
      saveWord: step('saveWord'),
    },
    completed: false,
  };
}

describe('buildLessonPath', () => {
  it('returns steps in the fixed order review -> story -> media -> game', () => {
    const steps = buildLessonPath({ dueWords: 0, quest: makeQuest() });
    expect(steps.map((s) => s.kind)).toEqual(['review', 'story', 'media', 'game']);
  });

  it('uses the correct hrefs, falling back to /stories when no next story', () => {
    const steps = buildLessonPath({ dueWords: 3, quest: makeQuest() });
    const byKind = Object.fromEntries(steps.map((s) => [s.kind, s.href]));
    expect(byKind.review).toBe('/progress/review');
    expect(byKind.story).toBe('/stories');
    expect(byKind.media).toBe('/videos');
    expect(byKind.game).toBe('/games');
  });

  it('links the story step to the provided next story id', () => {
    const steps = buildLessonPath({
      dueWords: 0,
      quest: makeQuest(),
      nextStoryId: 'abc-123',
      nextStoryTitle: 'The Cat',
    });
    const story = steps.find((s) => s.kind === 'story') as LessonStep;
    expect(story.href).toBe('/stories/abc-123');
    expect(story.descVi).toContain('The Cat');
  });

  it('marks the review step done only when there are no due words', () => {
    const withDue = buildLessonPath({ dueWords: 5, quest: makeQuest() });
    const noDue = buildLessonPath({ dueWords: 0, quest: makeQuest() });
    expect(withDue.find((s) => s.kind === 'review')!.done).toBe(false);
    expect(withDue.find((s) => s.kind === 'review')!.descVi).toContain('5');
    expect(noDue.find((s) => s.kind === 'review')!.done).toBe(true);
  });


  it('adds placement first when the learner has no placement result', () => {
    const steps = buildLessonPath({ dueWords: 0, quest: makeQuest(), placementDone: false });
    expect(steps.map((s) => s.kind)).toEqual(['placement', 'review', 'story', 'media', 'game']);
    expect(steps[0].href).toBe('/learn/placement');
  });

  it('adds checkpoint after the daily loop when a checkpoint is due', () => {
    const steps = buildLessonPath({ dueWords: 0, quest: makeQuest(), checkpointDue: true });
    expect(steps.map((s) => s.kind)).toEqual(['review', 'story', 'media', 'game', 'checkpoint']);
    expect(steps.at(-1)?.href).toBe('/learn/checkpoint');
  });
  it('derives story/media/game done flags from the quest state', () => {
    const quest = makeQuest({ story: true, game: true });
    const steps = buildLessonPath({ dueWords: 2, quest });
    expect(steps.find((s) => s.kind === 'story')!.done).toBe(true);
    expect(steps.find((s) => s.kind === 'media')!.done).toBe(false);
    expect(steps.find((s) => s.kind === 'game')!.done).toBe(true);
  });
});

describe('getLessonSummary', () => {
  it('counts total and done steps', () => {
    const steps = buildLessonPath({ dueWords: 0, quest: makeQuest({ story: true }) });
    const summary = getLessonSummary(steps);
    // review done (dueWords 0) + story done = 2
    expect(summary.total).toBe(4);
    expect(summary.done).toBe(2);
    expect(summary.allDone).toBe(false);
  });

  it('reports allDone true when every step is complete', () => {
    const quest = makeQuest({ story: true, media: true, game: true });
    const steps = buildLessonPath({ dueWords: 0, quest });
    const summary = getLessonSummary(steps);
    expect(summary.done).toBe(4);
    expect(summary.allDone).toBe(true);
  });
});
