import { describe, expect, it } from 'vitest';
import { rankForStats, rankStatus, requirementProgress } from '../rank';
import type { ProgressionStats } from '../types';

function stats(patch: Partial<ProgressionStats> = {}): ProgressionStats {
  return {
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
    rank: 'E',
    ...patch,
  };
}

describe('rank ladder', () => {
  it('starts at E — Awakening', () => {
    expect(rankForStats(stats())).toBe('E');
  });

  it('requires level AND quests AND active days for D', () => {
    expect(rankForStats(stats({ level: 3, completedQuests: 5, distinctActiveDays: 2 }))).toBe('E');
    expect(rankForStats(stats({ level: 3, completedQuests: 5, distinctActiveDays: 3 }))).toBe('D');
  });

  it('requires balanced path progress for B (not XP farming)', () => {
    const nearly = stats({
      level: 10,
      completedQuests: 30,
      distinctActiveDays: 14,
      achievementsEarned: 4,
      questsByPath: { vitality: 15, intelligence: 15, discipline: 4 },
    });
    expect(rankForStats(nearly)).toBe('C');

    const balanced = { ...nearly, questsByPath: { vitality: 10, intelligence: 11, discipline: 9 } };
    expect(rankForStats(balanced)).toBe('B');
  });

  it('requires lessons and sessions for A and beyond', () => {
    const base = stats({
      level: 15,
      completedQuests: 60,
      distinctActiveDays: 30,
      achievementsEarned: 6,
      questsByPath: { vitality: 20, intelligence: 22, discipline: 20 },
      lessonsCompleted: 10,
      workoutsLogged: 12,
    });
    expect(rankForStats(base)).toBe('A');
    expect(rankForStats({ ...base, lessonsCompleted: 9 })).toBe('B');
  });

  it('accepts longest streak for the streak requirement', () => {
    const ssReady = stats({
      level: 30,
      completedQuests: 160,
      distinctActiveDays: 120,
      achievementsEarned: 12,
      questsByPath: { vitality: 60, intelligence: 60, discipline: 60 },
      currentStreak: 0,
      longestStreak: 20,
    });
    expect(rankForStats(ssReady)).toBe('SS');
  });
});

describe('rank status (next-rank requirements)', () => {
  it('lists progress for every requirement of the next rank', () => {
    const status = rankStatus(stats({ level: 2, completedQuests: 2, distinctActiveDays: 1 }));
    expect(status.current.tier).toBe('E');
    expect(status.next?.tier).toBe('D');
    expect(status.nextProgress).toHaveLength(3);
    const quests = status.nextProgress.find((p) => p.requirement.metric === 'quests')!;
    expect(quests.current).toBe(2);
    expect(quests.target).toBe(5);
    expect(quests.met).toBe(false);
    expect(status.percent).toBeGreaterThan(0);
    expect(status.percent).toBeLessThan(100);
  });

  it('reports 100% at the top rank', () => {
    const top = stats({
      level: 30,
      completedQuests: 160,
      distinctActiveDays: 120,
      achievementsEarned: 12,
      longestStreak: 14,
      questsByPath: { vitality: 60, intelligence: 60, discipline: 60 },
    });
    const status = rankStatus({ ...top, rank: rankForStats(top) });
    expect(status.next).toBeNull();
    expect(status.percent).toBe(100);
  });

  it('scales requirement progress linearly', () => {
    const progress = requirementProgress(
      { label: 'Complete 5 quests', metric: 'quests', target: 10 },
      stats({ completedQuests: 4 }),
    );
    expect(progress.percent).toBe(40);
  });
});
