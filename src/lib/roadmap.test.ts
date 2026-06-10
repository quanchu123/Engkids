import { describe, it, expect } from 'vitest';
import { buildRoadmap, type RoadmapStats } from '@/lib/roadmap';
import { CURRICULUM_STAGES } from '@/lib/curriculum';

const ZERO: RoadmapStats = { masteredWords: 0, completedStories: 0, strongGameScores: 0 };

const stage0 = CURRICULUM_STAGES[0];

describe('buildRoadmap', () => {
  it('creates one group per stage, each with 4 nodes (3 milestones + checkpoint)', () => {
    const model = buildRoadmap({ stats: ZERO });
    expect(model.groups).toHaveLength(CURRICULUM_STAGES.length);
    for (const group of model.groups) {
      expect(group.nodes).toHaveLength(4);
      expect(group.nodes.map((n) => n.kind)).toEqual(['words', 'story', 'game', 'checkpoint']);
    }
  });

  it('marks the very first node as current for a brand-new learner', () => {
    const model = buildRoadmap({ stats: ZERO });
    expect(model.currentIndex).toBe(0);
    expect(model.currentNodeId).toBe(`${stage0.id}:words`);
    const firstNode = model.nodes.find((n) => n.id === model.currentNodeId);
    expect(firstNode?.status).toBe('current');
  });

  it('locks every node in stages after the current one', () => {
    const model = buildRoadmap({ stats: ZERO, currentStageId: stage0.id });
    const laterStageNodes = model.nodes.filter((n) => n.stageId !== stage0.id);
    expect(laterStageNodes.length).toBeGreaterThan(0);
    expect(laterStageNodes.every((n) => n.status === 'locked')).toBe(true);
  });

  it('completes a milestone node when the matching stat reaches the stage target', () => {
    const stats: RoadmapStats = { masteredWords: stage0.targetWords, completedStories: 0, strongGameScores: 0 };
    const model = buildRoadmap({ stats });
    const wordsNode = model.nodes.find((n) => n.id === `${stage0.id}:words`);
    expect(wordsNode?.status).toBe('done');
    expect(wordsNode?.progress?.percent).toBe(100);
    // current advances to the next not-done node (story)
    expect(model.currentNodeId).toBe(`${stage0.id}:story`);
  });

  it('keeps the checkpoint locked until all three milestones are done', () => {
    const partial: RoadmapStats = { masteredWords: stage0.targetWords, completedStories: stage0.targetStories, strongGameScores: 0 };
    const model = buildRoadmap({ stats: partial });
    const checkpoint = model.nodes.find((n) => n.id === `${stage0.id}:checkpoint`);
    expect(checkpoint?.status).toBe('locked');
  });

  it('unlocks the checkpoint once all milestones are complete', () => {
    const full: RoadmapStats = {
      masteredWords: stage0.targetWords,
      completedStories: stage0.targetStories,
      strongGameScores: stage0.targetGames,
    };
    const model = buildRoadmap({ stats: full });
    const checkpoint = model.nodes.find((n) => n.id === `${stage0.id}:checkpoint`);
    expect(checkpoint?.status).toBe('current');
    expect(model.currentNodeId).toBe(`${stage0.id}:checkpoint`);
  });

  it('treats all nodes in earlier stages as done when the learner is on a later stage', () => {
    const laterStage = CURRICULUM_STAGES[1];
    const model = buildRoadmap({ stats: ZERO, currentStageId: laterStage.id });
    const earlierNodes = model.nodes.filter((n) => n.stageId === stage0.id);
    expect(earlierNodes.every((n) => n.status === 'done')).toBe(true);
    expect(model.groups[0].percent).toBe(100);
  });

  it('respects an explicit unlocked stage list', () => {
    const model = buildRoadmap({
      stats: ZERO,
      currentStageId: stage0.id,
      unlockedStageIds: [stage0.id, CURRICULUM_STAGES[1].id],
    });
    // current node still in stage 0; stage 1 stays gated by stage status (locked nodes),
    // but the unlock set should not crash and stage 0 remains current.
    expect(model.currentIndex).toBe(0);
    expect(model.groups[1].status).toBe('locked');
  });

  it('computes overall percent as the average of stage percents', () => {
    const model = buildRoadmap({ stats: ZERO });
    expect(model.overallPercent).toBe(0);

    const allDoneFirst: RoadmapStats = {
      masteredWords: stage0.targetWords,
      completedStories: stage0.targetStories,
      strongGameScores: stage0.targetGames,
    };
    const model2 = buildRoadmap({ stats: allDoneFirst, checkpointPassed: true });
    expect(model2.overallPercent).toBeGreaterThan(0);
    expect(model2.groups[0].percent).toBe(100);
  });

  it('caps milestone progress current at the target (never over 100%)', () => {
    const over: RoadmapStats = {
      masteredWords: stage0.targetWords * 5,
      completedStories: 0,
      strongGameScores: 0,
    };
    const model = buildRoadmap({ stats: over });
    const wordsNode = model.nodes.find((n) => n.id === `${stage0.id}:words`);
    expect(wordsNode?.progress?.percent).toBe(100);
    expect(wordsNode?.progress?.current).toBe(stage0.targetWords);
  });
});
