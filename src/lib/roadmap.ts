import {
  CURRICULUM_STAGES,
  getStageIndex,
  type CurriculumStage,
  type CurriculumStageId,
} from './curriculum';

// ============================================================
// ROADMAP PATH MODEL
// ============================================================
// Turns the CEFR curriculum stages + a learner's real progress into a
// kid-friendly "journey": each stage becomes a world, and inside every world a
// short sequence of milestone nodes (words -> story -> game -> checkpoint) that
// unlock in order. Pure + deterministic so it can be unit tested without React
// or the database.

export type RoadmapNodeKind = 'words' | 'story' | 'game' | 'checkpoint' | 'trophy';
export type RoadmapNodeStatus = 'done' | 'current' | 'unlocked' | 'locked';

export interface RoadmapMilestoneProgress {
  current: number;
  target: number;
  percent: number;
}

export interface RoadmapNode {
  id: string;
  stageId: CurriculumStageId;
  kind: RoadmapNodeKind;
  titleVi: string;
  subtitleVi: string;
  href: string;
  status: RoadmapNodeStatus;
  progress: RoadmapMilestoneProgress | null;
}

export interface RoadmapStageGroup {
  stage: CurriculumStage;
  index: number;
  status: Exclude<RoadmapNodeStatus, 'unlocked'>;
  percent: number;
  nodes: RoadmapNode[];
}

export interface RoadmapStats {
  masteredWords: number;
  completedStories: number;
  strongGameScores: number;
}

export interface BuildRoadmapInput {
  stages?: CurriculumStage[];
  currentStageId?: CurriculumStageId | string | null;
  unlockedStageIds?: Array<CurriculumStageId | string> | null;
  stats: RoadmapStats;
  /** Whether the most recent checkpoint for the current stage has passed. */
  checkpointPassed?: boolean;
}

export interface RoadmapModel {
  groups: RoadmapStageGroup[];
  nodes: RoadmapNode[];
  currentIndex: number;
  currentNodeId: string | null;
  overallPercent: number;
}

function pct(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(Math.round((current / target) * 100), 100);
}

function milestone(current: number, target: number): RoadmapMilestoneProgress {
  const safeCurrent = Math.max(0, Math.min(current, target));
  return { current: safeCurrent, target, percent: pct(current, target) };
}

// Node href targets reuse the existing learning surfaces.
const NODE_HREF: Record<RoadmapNodeKind, string> = {
  words: '/learn/today',
  story: '/stories',
  game: '/games',
  checkpoint: '/learn/checkpoint',
  trophy: '/roadmap',
};

const NODE_TITLE: Record<RoadmapNodeKind, string> = {
  words: 'Học từ mới',
  story: 'Đọc truyện',
  game: 'Chơi game',
  checkpoint: 'Vượt ải',
  trophy: 'Cúp chặng',
};

/**
 * Build the full kid-friendly roadmap journey from curriculum + learner state.
 *
 * Status rules:
 * - Stages before the current stage are fully `done`.
 * - The current stage is `current`; later stages are `locked` unless explicitly
 *   unlocked (e.g. after passing a stage-exit test).
 * - Inside a stage, milestone nodes complete when the learner's matching stat
 *   reaches that stage's target. The first not-done node of the current stage
 *   becomes `current`; the rest stay `unlocked`. Locked-stage nodes are `locked`.
 */
export function buildRoadmap(input: BuildRoadmapInput): RoadmapModel {
  const stages = input.stages?.length ? input.stages : CURRICULUM_STAGES;
  const currentIndex = Math.min(
    Math.max(getStageIndex(input.currentStageId ?? undefined), 0),
    stages.length - 1,
  );
  const unlocked = new Set<string>(
    (input.unlockedStageIds || stages.slice(0, currentIndex + 1).map((s) => s.id)).map(String),
  );
  const stats = input.stats;

  const groups: RoadmapStageGroup[] = [];
  const allNodes: RoadmapNode[] = [];
  let currentNodeId: string | null = null;

  stages.forEach((stage, index) => {
    const stageStatus: Exclude<RoadmapNodeStatus, 'unlocked'> =
      index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'locked';
    const stageDone = stageStatus === 'done';
    const stageLocked = stageStatus === 'locked';

    // Done stages display as fully complete; current uses real stats; locked 0.
    const wordsCur = stageDone ? stage.targetWords : stageLocked ? 0 : stats.masteredWords;
    const storyCur = stageDone ? stage.targetStories : stageLocked ? 0 : stats.completedStories;
    const gameCur = stageDone ? stage.targetGames : stageLocked ? 0 : stats.strongGameScores;

    const milestones: Array<{ kind: RoadmapNodeKind; cur: number; target: number }> = [
      { kind: 'words', cur: wordsCur, target: stage.targetWords },
      { kind: 'story', cur: storyCur, target: stage.targetStories },
      { kind: 'game', cur: gameCur, target: stage.targetGames },
    ];

    const wordsDone = wordsCur >= stage.targetWords;
    const storyDone = storyCur >= stage.targetStories;
    const gameDone = gameCur >= stage.targetGames;
    const milestonesDone = wordsDone && storyDone && gameDone;
    const checkpointDone = stageDone || (input.checkpointPassed === true && milestonesDone);

    const nodes: RoadmapNode[] = [];

    milestones.forEach(({ kind, cur, target }) => {
      const done = cur >= target;
      const status: RoadmapNodeStatus = stageDone
        ? 'done'
        : stageLocked
          ? 'locked'
          : done
            ? 'done'
            : 'unlocked';
      nodes.push({
        id: `${stage.id}:${kind}`,
        stageId: stage.id,
        kind,
        titleVi: NODE_TITLE[kind],
        subtitleVi: subtitleFor(kind, cur, target),
        href: NODE_HREF[kind],
        status,
        progress: milestone(cur, target),
      });
    });

    // Checkpoint node closes each stage.
    nodes.push({
      id: `${stage.id}:checkpoint`,
      stageId: stage.id,
      kind: 'checkpoint',
      titleVi: NODE_TITLE.checkpoint,
      subtitleVi: checkpointDone
        ? 'Đã vượt ải chặng này.'
        : milestonesDone
          ? 'Sẵn sàng! Làm bài kiểm tra để qua chặng.'
          : 'Hoàn thành các mốc trên để mở ải.',
      href: NODE_HREF.checkpoint,
      status: stageDone
        ? 'done'
        : stageLocked
          ? 'locked'
          : checkpointDone
            ? 'done'
            : milestonesDone
              ? 'unlocked'
              : 'locked',
      progress: null,
    });

    // Promote the first not-done node in the current stage to `current`.
    if (stageStatus === 'current' && currentNodeId === null) {
      const next = nodes.find((n) => n.status === 'unlocked');
      if (next) {
        next.status = 'current';
        currentNodeId = next.id;
      }
    }

    const stagePercent = stageDone
      ? 100
      : stageLocked
        ? 0
        : Math.round((pct(wordsCur, stage.targetWords) + pct(storyCur, stage.targetStories) + pct(gameCur, stage.targetGames)) / 3);

    groups.push({ stage, index, status: stageStatus, percent: stagePercent, nodes });
    allNodes.push(...nodes);
  });

  const overallPercent = Math.round(
    groups.reduce((sum, g) => sum + g.percent, 0) / Math.max(groups.length, 1),
  );

  return {
    groups,
    nodes: allNodes,
    currentIndex,
    currentNodeId,
    overallPercent,
  };
}

function subtitleFor(kind: RoadmapNodeKind, current: number, target: number): string {
  const remaining = Math.max(target - current, 0);
  switch (kind) {
    case 'words':
      return remaining > 0 ? `Còn ${remaining} từ để nhớ tốt` : 'Đã thuộc đủ từ!';
    case 'story':
      return remaining > 0 ? `Còn ${remaining} truyện cần đọc` : 'Đã đọc đủ truyện!';
    case 'game':
      return remaining > 0 ? `Còn ${remaining} lượt game đạt 70%+` : 'Đã chơi giỏi đủ game!';
    default:
      return '';
  }
}
