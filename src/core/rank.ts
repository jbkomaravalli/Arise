import { RANK_LADDER, type RankDefinition, type RankRequirement } from './config';
import type { ProgressionStats, RankTier } from './types';

export interface RequirementProgress {
  requirement: RankRequirement;
  current: number;
  target: number;
  met: boolean;
  /** 0–1 progress toward this single requirement. */
  percent: number;
}

function currentFor(requirement: RankRequirement, stats: ProgressionStats): number {
  switch (requirement.metric) {
    case 'level':
      return stats.level;
    case 'quests':
      return stats.completedQuests;
    case 'activeDays':
      return stats.distinctActiveDays;
    case 'achievements':
      return stats.achievementsEarned;
    case 'lessons':
      return stats.lessonsCompleted;
    case 'workouts':
      return stats.workoutsLogged;
    case 'streak':
      return Math.max(stats.currentStreak, stats.longestStreak);
    case 'pathQuests':
      return requirement.path ? stats.questsByPath[requirement.path] : 0;
  }
}

export function requirementProgress(
  requirement: RankRequirement,
  stats: ProgressionStats,
): RequirementProgress {
  const current = currentFor(requirement, stats);
  const target = requirement.target;
  return {
    requirement,
    current,
    target,
    met: current >= target,
    percent: target <= 0 ? 100 : Math.min(100, (current / target) * 100),
  };
}

/** The highest rank whose requirements are all satisfied. */
export function rankForStats(stats: Omit<ProgressionStats, 'rank'>): RankTier {
  let result: RankTier = 'E';
  for (const def of RANK_LADDER) {
    const full = { ...stats, rank: def.tier } as ProgressionStats;
    const met = def.requirements.every((r) => requirementProgress(r, full).met);
    if (met) result = def.tier;
  }
  return result;
}

export function rankDefinition(tier: RankTier): RankDefinition {
  return RANK_LADDER.find((r) => r.tier === tier) ?? RANK_LADDER[0];
}

export function nextRankDefinition(tier: RankTier): RankDefinition | null {
  const idx = RANK_LADDER.findIndex((r) => r.tier === tier);
  if (idx === -1 || idx >= RANK_LADDER.length - 1) return null;
  return RANK_LADDER[idx + 1];
}

export interface RankStatus {
  current: RankDefinition;
  next: RankDefinition | null;
  /** Progress for every requirement of the next rank (or all met). */
  nextProgress: RequirementProgress[];
  /** 0–100 aggregate progress toward the next rank. */
  percent: number;
}

export function rankStatus(stats: ProgressionStats): RankStatus {
  const current = rankDefinition(stats.rank);
  const next = nextRankDefinition(stats.rank);
  if (!next) {
    return { current, next: null, nextProgress: [], percent: 100 };
  }
  const nextProgress = next.requirements.map((r) => requirementProgress(r, stats));
  const percent =
    nextProgress.length === 0
      ? 100
      : nextProgress.reduce((sum, p) => sum + p.percent, 0) / nextProgress.length;
  return { current, next, nextProgress, percent };
}
