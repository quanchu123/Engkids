import { DailyQuestState } from '@/types';

/**
 * A single step in the guided daily learning path ("Hôm nay học gì").
 * Pure data describing what the child should do next and whether it is done.
 */
export type LessonStep = {
  id: string;
  kind: 'placement' | 'review' | 'story' | 'media' | 'game' | 'checkpoint';
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
  placementDone?: boolean;
  checkpointDue?: boolean;
}

/**
 * Build the ordered list of lesson steps for today.
 *
 * Order is fixed: placement if needed -> review -> story -> media -> game ->
 * checkpoint if due. Each step's `done` flag is derived from DB-backed learner
 * state and the daily quest state.
 */
export function buildLessonPath(input: BuildLessonPathInput): LessonStep[] {
  const { dueWords, quest, nextStoryId, nextStoryTitle, placementDone = true, checkpointDue = false } = input;

  const reviewDesc =
    dueWords > 0
      ? `Bạn có ${dueWords} từ cần ôn lại hôm nay.`
      : 'Tuyệt vời! Không có từ nào cần ôn hôm nay.';

  const storyDesc = nextStoryTitle
    ? `Đọc truyện "${nextStoryTitle}" và khám phá từ mới.`
    : 'Đọc một truyện thú vị và khám phá từ mới.';

  const steps: LessonStep[] = [];

  if (!placementDone) {
    steps.push({
      id: 'placement',
      kind: 'placement',
      titleVi: 'Kiểm tra đầu vào',
      descVi: 'Làm placement test để hệ thống xếp đúng chặng học và lưu kết quả vào DB.',
      href: '/learn/placement',
      emoji: '🎯',
      done: false,
    });
  }

  steps.push(
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
  );

  if (checkpointDue) {
    steps.push({
      id: 'checkpoint',
      kind: 'checkpoint',
      titleVi: 'Checkpoint lộ trình',
      descVi: 'Làm bài kiểm tra ngắn để cập nhật mastery và mở nhiệm vụ tiếp theo.',
      href: '/learn/checkpoint',
      emoji: '✅',
      done: false,
    });
  }

  return steps;
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