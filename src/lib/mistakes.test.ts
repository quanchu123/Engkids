import { describe, it, expect } from 'vitest';
import type { MistakeItem } from '@/types';
import { summarizeMistakes, buildMistakeQueue, buildChoices } from '@/lib/mistakes';

function mk(over: Partial<MistakeItem> = {}): MistakeItem {
  return {
    id: over.id || Math.random().toString(36).slice(2),
    kind: over.kind || 'vocab',
    promptVi: over.promptVi || '',
    questionEn: over.questionEn || '',
    yourAnswer: over.yourAnswer || '',
    correctAnswer: over.correctAnswer ?? 'cat',
    addedAt: over.addedAt || '2024-01-01T00:00:00.000Z',
    reviewCount: over.reviewCount ?? 0,
    resolved: over.resolved ?? false,
    ...over,
  };
}

describe('summarizeMistakes', () => {
  it('counts total, unresolved, resolved and groups by kind', () => {
    const s = summarizeMistakes([
      mk({ kind: 'vocab', resolved: false }),
      mk({ kind: 'vocab', resolved: true }),
      mk({ kind: 'grammar', resolved: false }),
    ]);
    expect(s.total).toBe(3);
    expect(s.unresolved).toBe(2);
    expect(s.resolved).toBe(1);
    expect(s.byKind.vocab).toBe(2);
    expect(s.byKind.grammar).toBe(1);
  });

  it('buckets unknown kinds under other', () => {
    const s = summarizeMistakes([mk({ kind: 'weird' as never })]);
    expect(s.byKind.other).toBe(1);
  });
});

describe('buildMistakeQueue', () => {
  it('excludes resolved mistakes', () => {
    const q = buildMistakeQueue([
      mk({ id: 'a', resolved: true }),
      mk({ id: 'b', resolved: false }),
    ]);
    expect(q.map((m) => m.id)).toEqual(['b']);
  });

  it('excludes mistakes with no correct answer', () => {
    const q = buildMistakeQueue([mk({ id: 'a', correctAnswer: '' })]);
    expect(q).toHaveLength(0);
  });

  it('orders by fewest reviews then oldest', () => {
    const q = buildMistakeQueue([
      mk({ id: 'new-many', reviewCount: 5, addedAt: '2024-01-03T00:00:00.000Z' }),
      mk({ id: 'old-few', reviewCount: 0, addedAt: '2024-01-01T00:00:00.000Z' }),
      mk({ id: 'mid-few', reviewCount: 0, addedAt: '2024-01-02T00:00:00.000Z' }),
    ]);
    expect(q.map((m) => m.id)).toEqual(['old-few', 'mid-few', 'new-many']);
  });

  it('caps the queue at the limit', () => {
    const items = Array.from({ length: 30 }, (_, i) => mk({ id: `m${i}` }));
    expect(buildMistakeQueue(items, 20)).toHaveLength(20);
  });
});

describe('buildChoices', () => {
  it('puts the correct answer first and adds sibling distractors', () => {
    const target = mk({ id: 't', correctAnswer: 'cat' });
    const pool = [mk({ correctAnswer: 'dog' }), mk({ correctAnswer: 'fish' }), mk({ correctAnswer: 'bird' })];
    const choices = buildChoices(target, pool, 3);
    expect(choices[0]).toBe('cat');
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4); // no duplicates
  });

  it('never duplicates the correct answer as a distractor', () => {
    const target = mk({ correctAnswer: 'cat' });
    const pool = [mk({ correctAnswer: 'cat' }), mk({ correctAnswer: 'dog' })];
    const choices = buildChoices(target, pool, 3);
    expect(choices.filter((c) => c === 'cat')).toHaveLength(1);
  });

  it("falls back to the child's own wrong answer when siblings are scarce", () => {
    const target = mk({ correctAnswer: 'cat', yourAnswer: 'car' });
    const choices = buildChoices(target, [], 3);
    expect(choices).toContain('car');
  });
});
