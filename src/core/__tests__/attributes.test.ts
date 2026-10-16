import { describe, expect, it } from 'vitest';
import { computeAttributeScores, nextMilestone, scoreFromAttributeXp } from '../attributes';
import { evaluateAchievement, type AchievementContext } from '../achievements';
import { ACHIEVEMENTS } from '@/content/achievements';
import type { XpTransaction } from '../types';

function tx(weights: XpTransaction['attributeWeights'], amount = 25, key = Math.random().toString(36)): XpTransaction {
  return {
    id: `tx-${key}`,
    ownerId: 'u1',
    amount,
    sourceType: 'quest',
    sourceRef: 'a1',
    sourceLabel: 'Test',
    idempotencyKey: key,
    attributeWeights: weights,
    createdAt: '2026-10-15T10:00:00.000Z',
  };
}

describe('attribute scoring', () => {
  it('follows score = round(100 × (1 − e^(−xp/600)))', () => {
    expect(scoreFromAttributeXp(0)).toBe(0);
    expect(scoreFromAttributeXp(600)).toBe(63);
    expect(scoreFromAttributeXp(1800)).toBe(95);
    expect(scoreFromAttributeXp(100_000)).toBe(100);
  });

  it('is monotonic and bounded', () => {
    let previous = -1;
    for (let xp = 0; xp <= 5000; xp += 100) {
      const value = scoreFromAttributeXp(xp);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(100);
      previous = value;
    }
  });

  it('accumulates weighted XP from transactions', () => {
    const scores = computeAttributeScores([
      tx({ strength: 0.7, discipline: 0.1 }, 100, 'k1'),
      tx({ strength: 0.2, endurance: 0.8 }, 100, 'k2'),
    ]);
    const strength = scores.find((s) => s.attribute === 'strength')!;
    const endurance = scores.find((s) => s.attribute === 'endurance')!;
    expect(strength.xp).toBeCloseTo(90, 5);
    expect(endurance.xp).toBeCloseTo(80, 5);
    expect(strength.value).toBeGreaterThan(0);
  });

  it('reports the next milestone and remaining points', () => {
    const milestone = nextMilestone('strength', 5);
    expect(milestone?.milestone.at).toBe(10);
    expect(milestone?.remaining).toBe(5);
  });
});

function context(patch: Partial<AchievementContext> = {}): AchievementContext {
  const base = {
    lessons: [],
    assignments: [],
    journal: [],
    focusSessions: [],
    goals: [],
    transactions: [],
    templateById: () => null,
    stats: {
      totalXp: 0,
      level: 1,
      completedQuests: 0,
      distinctActiveDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      questsByPath: { vitality: 0, intelligence: 0, discipline: 0 },
      lessonsCompleted: 0,
      workoutsLogged: 0,
      reflectionsLogged: 0,
      focusMinutes: 0,
      achievementsEarned: 0,
      rank: 'E' as const,
    },
  };
  return {
    ...base,
    ...patch,
    stats: { ...base.stats, ...(patch.stats ?? {}) },
  };
}

describe('achievement rules', () => {
  const def = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;

  it('First Awakening unlocks after one completed quest', () => {
    expect(evaluateAchievement(def('first_awakening'), context())).toBe(false);
    expect(
      evaluateAchievement(def('first_awakening'), context({ stats: { completedQuests: 1 } as never })),
    ).toBe(true);
  });

  it('Balanced Hunter requires all three paths', () => {
    expect(
      evaluateAchievement(
        def('balanced_hunter'),
        context({
          stats: {
            questsByPath: { vitality: 6, intelligence: 6, discipline: 2 },
          } as never,
        }),
      ),
    ).toBe(false);
    expect(
      evaluateAchievement(
        def('balanced_hunter'),
        context({
          stats: {
            questsByPath: { vitality: 5, intelligence: 5, discipline: 5 },
          } as never,
        }),
      ),
    ).toBe(true);
  });

  it('Terminal Initiate counts only Linux-family lessons', () => {
    const lessons = [
      { ownerId: 'u1', lessonId: 'linux-01-navigate', state: 'completed' as const, quizAttempts: 1, updatedAt: '' },
      { ownerId: 'u1', lessonId: 'linux-02-files', state: 'completed' as const, quizAttempts: 1, updatedAt: '' },
      { ownerId: 'u1', lessonId: 'net-01-model', state: 'completed' as const, quizAttempts: 1, updatedAt: '' },
    ];
    expect(
      evaluateAchievement(def('terminal_initiate'), context({ lessons, stats: { lessonsCompleted: 3 } as never })),
    ).toBe(false);
    const moreLinux = [...lessons, 'linux-03-pipes', 'fs-01-permissions', 'proc-01-processes'].map((l) =>
      typeof l === 'string'
        ? { ownerId: 'u1', lessonId: l, state: 'completed' as const, quizAttempts: 1, updatedAt: '' }
        : l,
    );
    expect(
      evaluateAchievement(
        def('terminal_initiate'),
        context({ lessons: moreLinux, stats: { lessonsCompleted: 6 } as never }),
      ),
    ).toBe(true);
  });

  it('every achievement definition evaluates without throwing', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(() => evaluateAchievement(achievement, context())).not.toThrow();
    }
  });
});
