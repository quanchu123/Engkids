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

// ============================================================
// REAL LESSON PATH MODEL (Duolingo-style)
// ============================================================
// Turns the DB's real lessons (grouped in units, per CEFR stage) into a winding
// path where every lesson is a node that unlocks in order. Unlock rules:
// - A stage is "open" only if it is in the learner's unlockedStageIds (guests:
//   only the first stage). Lessons in a locked stage are all `locked`.
// - Inside an open stage, lessons unlock sequentially: a lesson is `unlocked`
//   once the previous lesson is `done`; the first lesson of an open stage is
//   always unlocked. Completed lessons are `done`.
// - Exactly one node across the whole map becomes `current`: the first not-done
//   unlocked lesson in the earliest open+incomplete stage.
// Pure + deterministic; no React, no DB. Lesson/unit shapes mirror the
// `LessonSummaryPublic` / `CurriculumUnitPublic` types from services/lessons.

export type LessonNodeStatus = 'done' | 'current' | 'unlocked' | 'locked';

export interface LessonRoadmapNodeInput {
  id: string;
  unitId: string;
  stageId: CurriculumStageId | string;
  titleVi: string;
  objectiveVi?: string;
  estimatedMinutes?: number;
  skillFocus?: string[];
  sortOrder?: number;
  progress?: { status?: string | null } | null;
}

export interface LessonRoadmapUnitInput {
  id: string;
  stageId: CurriculumStageId | string;
  titleVi: string;
  theme: string;
  sortOrder?: number;
}

export interface LessonRoadmapNode {
  lessonId: string;
  unitId: string;
  stageId: CurriculumStageId;
  titleVi: string;
  objectiveVi: string;
  estimatedMinutes: number;
  skillFocus: string[];
  href: string;
  status: LessonNodeStatus;
  orderInStage: number;
}

export interface LessonRoadmapUnit {
  unitId: string;
  titleVi: string;
  theme: string;
  stageId: CurriculumStageId;
  sortOrder: number;
  doneCount: number;
  totalCount: number;
  percent: number;
  nodes: LessonRoadmapNode[];
}

export interface LessonRoadmapStage {
  stage: CurriculumStage;
  index: number;
  open: boolean;
  status: LessonNodeStatus;
  doneCount: number;
  totalCount: number;
  percent: number;
  units: LessonRoadmapUnit[];
}

export interface BuildLessonRoadmapInput {
  stages: CurriculumStage[];
  units: LessonRoadmapUnitInput[];
  lessons: LessonRoadmapNodeInput[];
  unlockedStageIds?: Array<CurriculumStageId | string> | null;
  currentStageId?: CurriculumStageId | string | null;
  isAuthenticated: boolean;
}

export interface LessonRoadmapModel {
  stages: LessonRoadmapStage[];
  allNodes: LessonRoadmapNode[];
  currentLessonId: string | null;
  totalLessons: number;
  doneLessons: number;
  overallPercent: number;
  finished: boolean;
}

const FALLBACK_UNIT_SORT = Number.MAX_SAFE_INTEGER;

export function buildLessonRoadmap(input: BuildLessonRoadmapInput): LessonRoadmapModel {
  const stages = input.stages?.length ? input.stages : CURRICULUM_STAGES;
  const isDone = (n: LessonRoadmapNodeInput) => (n.progress?.status || '') === 'done';

  // Stage gate: open stages come from unlockedStageIds (auth) or just the first
  // stage (guest / no state).
  const unlockedSet = new Set<string>((input.unlockedStageIds || []).map(String));
  const currentIdx = Math.min(Math.max(getStageIndex(input.currentStageId ?? undefined), 0), stages.length - 1);
  const isStageOpen = (stageId: string, index: number): boolean => {
    if (!input.isAuthenticated) return index === 0;
    if (unlockedSet.size > 0) return unlockedSet.has(stageId);
    return index === 0;
  };

  // Index units + lessons by stage.
  const unitsByStage = new Map<string, LessonRoadmapUnitInput[]>();
  for (const u of input.units || []) {
    const key = String(u.stageId);
    if (!unitsByStage.has(key)) unitsByStage.set(key, []);
    unitsByStage.get(key)!.push(u);
  }
  const lessonsByStage = new Map<string, LessonRoadmapNodeInput[]>();
  for (const l of input.lessons || []) {
    const key = String(l.stageId);
    if (!lessonsByStage.has(key)) lessonsByStage.set(key, []);
    lessonsByStage.get(key)!.push(l);
  }

  const allNodes: LessonRoadmapNode[] = [];
  const stageModels: LessonRoadmapStage[] = [];
  let totalLessons = 0;
  let doneLessons = 0;

  stages.forEach((stage, index) => {
    const open = isStageOpen(stage.id, index);
    const stageLessons = lessonsByStage.get(stage.id) || [];
    const stageUnits = unitsByStage.get(stage.id) || [];

    // Resolve a unit for every lesson; lessons with an unknown unit fall into a
    // synthetic "Ôn tập" unit rendered last.
    const unitById = new Map<string, LessonRoadmapUnitInput>();
    for (const u of stageUnits) unitById.set(u.id, u);

    const unitOrder = (unitId: string): number => unitById.get(unitId)?.sortOrder ?? FALLBACK_UNIT_SORT;

    // Canonical sequence: unit.sortOrder ASC, then lesson.sortOrder ASC.
    const sequence = [...stageLessons].sort((a, b) => {
      const ua = unitOrder(a.unitId);
      const ub = unitOrder(b.unitId);
      if (ua !== ub) return ua - ub;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    // Build per-lesson status with a sequential frontier reset per stage.
    let prevDone = true;
    const builtNodes: LessonRoadmapNode[] = sequence.map((l, i) => {
      const done = isDone(l);
      let status: LessonNodeStatus;
      if (!open) status = 'locked';
      else if (done) status = 'done';
      else if (prevDone) status = 'unlocked';
      else status = 'locked';
      prevDone = done;
      const node: LessonRoadmapNode = {
        lessonId: l.id,
        unitId: l.unitId,
        stageId: stage.id,
        titleVi: l.titleVi,
        objectiveVi: l.objectiveVi || '',
        estimatedMinutes: l.estimatedMinutes || 0,
        skillFocus: l.skillFocus || [],
        href: `/learn/lessons/${l.id}`,
        status,
        orderInStage: i,
      };
      return node;
    });

    totalLessons += builtNodes.length;
    const stageDone = builtNodes.filter((n) => n.status === 'done').length;
    doneLessons += stageDone;

    // Group nodes into units for rendering (omit empty units).
    const groups = new Map<string, LessonRoadmapNode[]>();
    for (const n of builtNodes) {
      if (!groups.has(n.unitId)) groups.set(n.unitId, []);
      groups.get(n.unitId)!.push(n);
    }
    const unitModels: LessonRoadmapUnit[] = [];
    for (const [unitId, nodes] of groups.entries()) {
      const meta = unitById.get(unitId);
      const done = nodes.filter((n) => n.status === 'done').length;
      unitModels.push({
        unitId,
        titleVi: meta?.titleVi || 'Ôn tập',
        theme: meta?.theme || 'general',
        stageId: stage.id,
        sortOrder: meta?.sortOrder ?? FALLBACK_UNIT_SORT,
        doneCount: done,
        totalCount: nodes.length,
        percent: nodes.length ? Math.round((done / nodes.length) * 100) : 0,
        nodes,
      });
    }
    unitModels.sort((a, b) => a.sortOrder - b.sortOrder);

    const totalCount = builtNodes.length;
    const stagePercent = totalCount ? Math.round((stageDone / totalCount) * 100) : 0;
    const stageStatus: LessonNodeStatus = !open
      ? 'locked'
      : totalCount > 0 && stageDone === totalCount
        ? 'done'
        : 'unlocked';

    stageModels.push({
      stage,
      index,
      open,
      status: stageStatus,
      doneCount: stageDone,
      totalCount,
      percent: stagePercent,
      units: unitModels,
    });
    allNodes.push(...builtNodes);
  });

  // Promote exactly one node to `current`: the first unlocked (not done) node in
  // the earliest open+incomplete stage, by stage index then orderInStage.
  let currentLessonId: string | null = null;
  for (const sm of stageModels) {
    if (!sm.open) continue;
    const frontier = sm.units.flatMap((u) => u.nodes).find((n) => n.status === 'unlocked');
    if (frontier) {
      frontier.status = 'current';
      currentLessonId = frontier.lessonId;
      break;
    }
  }
  // Mark the owning stage as current.
  if (currentLessonId) {
    for (const sm of stageModels) {
      if (sm.units.some((u) => u.nodes.some((n) => n.lessonId === currentLessonId))) {
        if (sm.status !== 'done') sm.status = 'current';
        break;
      }
    }
  }

  const overallPercent = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;

  return {
    stages: stageModels,
    allNodes,
    currentLessonId,
    totalLessons,
    doneLessons,
    overallPercent,
    finished: totalLessons > 0 && doneLessons === totalLessons,
  };
}
