import { DailyQuestState } from '@/types';

/**
 * A single step in the guided daily learning path ("Hôm nay học gì").
 * Pure data describing what the child should do next and whether it is done.
 */
export type LessonStep = {
  id: string;
  kind: 'review' | 'story' | 'media' | 'game';
  titleVi: string;
  descVi: string;
  href: string;
  emoji: string;
  done: boolean;
};

export interface BuildLessonPathInput {
  dueWords: number;
  quest: DailyQuestState;
  nextStoryId?: string;
  nextStoryTitle?: string;
}

/**
 * Build the ordered list of lesson steps for today.
 *
 * Order is fixed: review -> story -> media -> game. Each step's `done` flag is
 * derived from the daily quest state (and the number of due words for review).
 * Pure function: no React, no `window`, no side effects.
 */
export function buildLessonPath(input: BuildLessonPathInput): LessonStep[] {
  const { dueWords, quest, nextStoryId, nextStoryTitle } = input;

  const reviewDesc =
    dueWords > 0
      ? `Bạn có ${dueWords} từ cần ôn lại hôm nay.`
      : 'Tuyệt vời! Không có từ nào cần ôn hôm nay.';

  const storyDesc = nextStoryTitle
    ? `Đọc truyện "${nextStoryTitle}" và khám phá từ mới.`
    : 'Đọc một truyện thú vị và khám phá từ mới.';

  return [
    {
      id: 'review',
      kind: 'review',
      titleVi: 'Ôn lại từ vựng',
      descVi: reviewDesc,
      href: '/progress/review',
      emoji: '🧠',
      done: dueWords === 0,
    },
    {
      id: 'story',
      kind: 'story',
      titleVi: 'Đọc truyện',
      descVi: storyDesc,
      href: nextStoryId ? `/stories/${nextStoryId}` : '/stories',
      emoji: '📖',
      done: quest.steps.story.done,
    },
    {
      id: 'media',
      kind: 'media',
      titleVi: 'Xem video',
      descVi: 'Xem một video tiếng Anh vui nhộn.',
      href: '/videos',
      emoji: '🎬',
      done: quest.steps.media.done,
    },
    {
      id: 'game',
      kind: 'game',
      titleVi: 'Chơi game',
      descVi: 'Chơi game để luyện tập từ đã học.',
      href: '/games',
      emoji: '🎮',
      done: quest.steps.game.done,
    },
  ];
}

/**
 * Summarise a lesson path: how many steps total, how many are done, and
 * whether every step is complete.
 */
export function getLessonSummary(steps: LessonStep[]): {
  total: number;
  done: number;
  allDone: boolean;
} {
  const total = steps.length;
  const done = steps.filter((step) => step.done).length;
  return {
    total,
    done,
    allDone: total > 0 && done === total,
  };
}
