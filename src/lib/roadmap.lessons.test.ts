import { describe, it, expect } from 'vitest';
import { CURRICULUM_STAGES } from './curriculum';
import {
  buildLessonRoadmap,
  type BuildLessonRoadmapInput,
  type LessonRoadmapNodeInput,
  type LessonRoadmapUnitInput,
} from './roadmap';

const A2 = CURRICULUM_STAGES[0]; // a2-key
const B1 = CURRICULUM_STAGES[1]; // b1-preliminary

function unit(id: string, stageId: string, sortOrder: number): LessonRoadmapUnitInput {
  return { id, stageId, titleVi: `Unit ${id}`, theme: 'general', sortOrder };
}

function lesson(
  id: string,
  unitId: string,
  stageId: string,
  sortOrder: number,
  done = false,
): LessonRoadmapNodeInput {
  return {
    id,
    unitId,
    stageId,
    titleVi: `Lesson ${id}`,
    sortOrder,
    progress: done ? { status: 'done' } : null,
  };
}

// 2 stages, 1 unit each, 2 lessons each.
function fixture(overrides: Partial<BuildLessonRoadmapInput> = {}): BuildLessonRoadmapInput {
  return {
    stages: [A2, B1],
    units: [unit('u-a2', A2.id, 100), unit('u-b1', B1.id, 100)],
    lessons: [
      lesson('a2-1', 'u-a2', A2.id, 1),
      lesson('a2-2', 'u-a2', A2.id, 2),
      lesson('b1-1', 'u-b1', B1.id, 1),
      lesson('b1-2', 'u-b1', B1.id, 2),
    ],
    unlockedStageIds: [A2.id],
    currentStageId: A2.id,
    isAuthenticated: true,
    ...overrides,
  };
}

const byId = (model: ReturnType<typeof buildLessonRoadmap>, id: string) =>
  model.allNodes.find((n) => n.lessonId === id)!;

describe('buildLessonRoadmap', () => {
  it('guest: only the first lesson of stage 0 is current; everything else locked', () => {
    const model = buildLessonRoadmap(fixture({ isAuthenticated: false, unlockedStageIds: null }));
    expect(byId(model, 'a2-1').status).toBe('current');
    expect(byId(model, 'a2-2').status).toBe('locked');
    expect(byId(model, 'b1-1').status).toBe('locked');
    expect(model.currentLessonId).toBe('a2-1');
    expect(model.overallPercent).toBe(0);
  });

  it('sequential frontier: first done -> done, second becomes current, later locked', () => {
    const model = buildLessonRoadmap(
      fixture({
        lessons: [
          lesson('a2-1', 'u-a2', A2.id, 1, true),
          lesson('a2-2', 'u-a2', A2.id, 2),
          lesson('b1-1', 'u-b1', B1.id, 1),
          lesson('b1-2', 'u-b1', B1.id, 2),
        ],
      }),
    );
    expect(byId(model, 'a2-1').status).toBe('done');
    expect(byId(model, 'a2-2').status).toBe('current');
    expect(byId(model, 'b1-1').status).toBe('locked'); // b1 not unlocked
    expect(model.currentLessonId).toBe('a2-2');
  });

  it('stage complete but next stage not unlocked -> stage done, next locked, no current', () => {
    const model = buildLessonRoadmap(
      fixture({
        lessons: [
          lesson('a2-1', 'u-a2', A2.id, 1, true),
          lesson('a2-2', 'u-a2', A2.id, 2, true),
          lesson('b1-1', 'u-b1', B1.id, 1),
          lesson('b1-2', 'u-b1', B1.id, 2),
        ],
        unlockedStageIds: [A2.id],
      }),
    );
    expect(model.stages[0].status).toBe('done');
    expect(model.stages[0].percent).toBe(100);
    expect(byId(model, 'b1-1').status).toBe('locked');
    expect(model.currentLessonId).toBeNull();
  });

  it('next stage unlocked while prior incomplete: current stays on stage-0 frontier', () => {
    const model = buildLessonRoadmap(
      fixture({
        lessons: [
          lesson('a2-1', 'u-a2', A2.id, 1, true),
          lesson('a2-2', 'u-a2', A2.id, 2),
          lesson('b1-1', 'u-b1', B1.id, 1),
          lesson('b1-2', 'u-b1', B1.id, 2),
        ],
        unlockedStageIds: [A2.id, B1.id],
      }),
    );
    expect(byId(model, 'a2-2').status).toBe('current');
    // b1 first lesson is unlocked (stage open) but NOT current.
    expect(byId(model, 'b1-1').status).toBe('unlocked');
    expect(model.currentLessonId).toBe('a2-2');
  });

  it('done aggregation: 1/2 done in a unit -> 50%; stage + overall match', () => {
    const model = buildLessonRoadmap(
      fixture({
        lessons: [
          lesson('a2-1', 'u-a2', A2.id, 1, true),
          lesson('a2-2', 'u-a2', A2.id, 2),
          lesson('b1-1', 'u-b1', B1.id, 1),
          lesson('b1-2', 'u-b1', B1.id, 2),
        ],
      }),
    );
    expect(model.stages[0].units[0].percent).toBe(50);
    expect(model.stages[0].percent).toBe(50);
    expect(model.doneLessons).toBe(1);
    expect(model.totalLessons).toBe(4);
    expect(model.overallPercent).toBe(25);
  });

  it('lesson with unknown unit falls into a synthetic unit rendered last', () => {
    const model = buildLessonRoadmap(
      fixture({
        units: [unit('u-a2', A2.id, 100)],
        lessons: [
          lesson('a2-1', 'u-a2', A2.id, 1),
          lesson('a2-orphan', 'missing-unit', A2.id, 2),
        ],
        stages: [A2],
      }),
    );
    const stage = model.stages[0];
    expect(stage.units.length).toBe(2);
    // synthetic unit is last (max sort order)
    expect(stage.units[stage.units.length - 1].nodes[0].lessonId).toBe('a2-orphan');
    // still sequenced: a2-1 current, orphan locked until a2-1 done
    expect(byId(model, 'a2-1').status).toBe('current');
    expect(byId(model, 'a2-orphan').status).toBe('locked');
  });

  it('empty unit (no lessons) is omitted', () => {
    const model = buildLessonRoadmap(
      fixture({
        units: [unit('u-a2', A2.id, 100), unit('u-empty', A2.id, 200)],
        lessons: [lesson('a2-1', 'u-a2', A2.id, 1)],
        stages: [A2],
      }),
    );
    expect(model.stages[0].units.map((u) => u.unitId)).toEqual(['u-a2']);
  });

  it('single-current invariant across multiple open incomplete stages', () => {
    const model = buildLessonRoadmap(
      fixture({
        unlockedStageIds: [A2.id, B1.id],
      }),
    );
    const currents = model.allNodes.filter((n) => n.status === 'current');
    expect(currents.length).toBe(1);
    expect(currents[0].lessonId).toBe('a2-1');
  });

  it('finished: all lessons done -> finished true, 100%, no current', () => {
    const model = buildLessonRoadmap(
      fixture({
        lessons: [
          lesson('a2-1', 'u-a2', A2.id, 1, true),
          lesson('a2-2', 'u-a2', A2.id, 2, true),
          lesson('b1-1', 'u-b1', B1.id, 1, true),
          lesson('b1-2', 'u-b1', B1.id, 2, true),
        ],
        unlockedStageIds: [A2.id, B1.id],
      }),
    );
    expect(model.finished).toBe(true);
    expect(model.overallPercent).toBe(100);
    expect(model.currentLessonId).toBeNull();
  });

  it('empty data: 0 total, 0%, not finished, no crash', () => {
    const model = buildLessonRoadmap({
      stages: [A2, B1],
      units: [],
      lessons: [],
      unlockedStageIds: [A2.id],
      currentStageId: A2.id,
      isAuthenticated: true,
    });
    expect(model.totalLessons).toBe(0);
    expect(model.overallPercent).toBe(0);
    expect(model.finished).toBe(false);
    expect(model.currentLessonId).toBeNull();
  });
});
