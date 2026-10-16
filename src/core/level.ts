import { PROGRESSION } from './config';

/**
 * Level engine.
 *
 * Documented, deterministic formula:
 *   XP required to reach (be) level L:  T(L) = 100 × (L − 1)²
 *   Level 1 starts at 0 XP.
 *
 * So `levelFromXp` inverts the cumulative curve:
 *   L = floor(sqrt(xp / 100)) + 1   (capped at PROGRESSION.levelCap)
 *
 * Example progression of thresholds:
 *   L1 = 0, L2 = 100, L3 = 400, L4 = 900, L5 = 1600, L10 = 8100
 */

export function xpThresholdForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return PROGRESSION.basePerLevel * (l - 1) ** 2;
}

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  const raw = Math.floor(Math.sqrt(xp / PROGRESSION.basePerLevel)) + 1;
  return Math.min(PROGRESSION.levelCap, Math.max(1, raw));
}

export interface LevelProgress {
  level: number;
  /** Cumulative XP at the start of the current level. */
  currentThreshold: number;
  /** Cumulative XP needed for the next level. */
  nextThreshold: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP still needed for the next level. */
  xpToNext: number;
  /** 0–1 completion of the current level. */
  percent: number;
  /** True when at the cap. */
  isMax: boolean;
}

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelFromXp(xp);
  const currentThreshold = xpThresholdForLevel(level);
  const isMax = level >= PROGRESSION.levelCap;
  const nextThreshold = isMax ? currentThreshold : xpThresholdForLevel(level + 1);
  const span = Math.max(1, nextThreshold - currentThreshold);
  const xpIntoLevel = xp - currentThreshold;
  return {
    level,
    currentThreshold,
    nextThreshold,
    xpIntoLevel,
    xpToNext: Math.max(0, nextThreshold - xp),
    percent: isMax ? 100 : Math.min(100, Math.max(0, (xpIntoLevel / span) * 100)),
    isMax,
  };
}
