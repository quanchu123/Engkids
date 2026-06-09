import { DailyQuestState } from '@/types';

export type LessonStep = {
  id: string;
  kind: 'placement' | 'review' | 'lesson' | 'story' | 'media' | 'game' | 'checkpoint';
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
  nextLessonId?: string;
  nextLessonTitle?: string;
  lessonDone?: boolean;
  placementDone?: boolean;
  checkpointDue?: boolean;
}

export function buildLessonPath(input: BuildLessonPathInput): LessonStep[] {
  const {
    dueWords,
    quest,
    nextStoryId,
    nextStoryTitle,
    nextLessonId,
    nextLessonTitle,
    lessonDone = false,
    placementDone = true,
    checkpointDue = false,
  } = input;

  const reviewDesc = dueWords > 0
    ? `Ban co ${dueWords} tu can on lai hom nay.`
    : 'Khong co tu nao can on hom nay.';
  const lessonDesc = nextLessonTitle
    ? `Lam lesson "${nextLessonTitle}" theo tung buoc ngan.`
    : 'Lam lesson tiep theo theo dung level cua be.';
  const storyDesc = nextStoryTitle
    ? `Doc truyen "${nextStoryTitle}" va kham pha tu moi.`
    : 'Doc mot truyen thu vi va kham pha tu moi.';

  const steps: LessonStep[] = [];

  if (!placementDone) {
    steps.push({
      id: 'placement',
      kind: 'placement',
      titleVi: 'Kiem tra dau vao',
      descVi: 'Lam placement test de he thong xep dung chang hoc va luu ket qua vao DB.',
      href: '/learn/placement',
      emoji: 'target',
      done: false,
    });
  }

  steps.push(
    {
      id: 'review',
      kind: 'review',
      titleVi: 'On lai tu vung',
      descVi: reviewDesc,
      href: '/progress/review',
      emoji: 'brain',
      done: dueWords === 0,
    },
    {
      id: 'lesson',
      kind: 'lesson',
      titleVi: 'Lesson tiep theo',
      descVi: lessonDesc,
      href: nextLessonId ? `/learn/lessons/${nextLessonId}` : '/learn/today',
      emoji: 'lesson',
      done: lessonDone,
    },
    {
      id: 'story',
      kind: 'story',
      titleVi: 'Doc truyen',
      descVi: storyDesc,
      href: nextStoryId ? `/stories/${nextStoryId}` : '/stories',
      emoji: 'book',
      done: quest.steps.story.done,
    },
    {
      id: 'media',
      kind: 'media',
      titleVi: 'Xem video',
      descVi: 'Xem mot video tieng Anh vui nhon.',
      href: '/videos',
      emoji: 'video',
      done: quest.steps.media.done,
    },
    {
      id: 'game',
      kind: 'game',
      titleVi: 'Choi game',
      descVi: 'Choi game de luyen tap tu da hoc.',
      href: '/games',
      emoji: 'game',
      done: quest.steps.game.done,
    },
  );

  if (checkpointDue) {
    steps.push({
      id: 'checkpoint',
      kind: 'checkpoint',
      titleVi: 'Checkpoint lo trinh',
      descVi: 'Lam bai kiem tra ngan de cap nhat mastery va mo nhiem vu tiep theo.',
      href: '/learn/checkpoint',
      emoji: 'check',
      done: false,
    });
  }

  return steps;
}

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

