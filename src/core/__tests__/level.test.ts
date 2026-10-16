import { describe, expect, it } from 'vitest';
import { levelFromXp, levelProgress, xpThresholdForLevel } from '../level';

describe('level engine', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpThresholdForLevel(1)).toBe(0);
  });

  it('follows the documented curve T(L) = 100 × (L − 1)²', () => {
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(xpThresholdForLevel(3)).toBe(400);
    expect(xpThresholdForLevel(4)).toBe(900);
    expect(xpThresholdForLevel(5)).toBe(1600);
    expect(xpThresholdForLevel(10)).toBe(8100);
  });

  it('derives the level from total XP at boundaries', () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(399)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
    expect(levelFromXp(899)).toBe(3);
    expect(levelFromXp(900)).toBe(4);
  });

  it('handles negative and non-integer input defensively', () => {
    expect(levelFromXp(-50)).toBe(1);
    expect(levelFromXp(0.9)).toBe(1);
  });

  it('caps at the level cap', () => {
    expect(levelFromXp(10_000_000)).toBe(100);
  });

  it('computes progress inside the current level', () => {
    const progress = levelProgress(250); // level 2, threshold 100 → 400
    expect(progress.level).toBe(2);
    expect(progress.currentThreshold).toBe(100);
    expect(progress.nextThreshold).toBe(400);
    expect(progress.xpIntoLevel).toBe(150);
    expect(progress.xpToNext).toBe(150);
    expect(progress.percent).toBeCloseTo(50, 5);
  });

  it('reports max level as complete', () => {
    const progress = levelProgress(10_000_000);
    expect(progress.isMax).toBe(true);
    expect(progress.percent).toBe(100);
  });
});
