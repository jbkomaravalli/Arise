import type {
  DevelopmentPath,
  FocusSession,
  JournalEntry,
  LearningProgress,
  ProgressionStats,
  QuestAssignment,
  QuestTemplate,
  RankTier,
  UserGoal,
  XpTransaction,
} from './types';

/** Achievement rules are data, so they can be mirrored by SQL and extended safely. */
export type AchievementRule =
  | { kind: 'completedQuests'; target: number }
  | { kind: 'activeDays'; target: number }
  | { kind: 'pathQuests'; path: DevelopmentPath; target: number }
  | { kind: 'workouts'; target: number }
  | { kind: 'lessons'; target: number; paths?: string[] }
  | { kind: 'quizPassed'; pathPrefix: string; minScore: number }
  | { kind: 'reflections'; target: number }
  | { kind: 'focusMinutes'; target: number }
  | { kind: 'streak'; target: number }
  | { kind: 'rankAtLeast'; tier: RankTier }
  | { kind: 'challenges'; target: number }
  | { kind: 'balanced'; target: number }
  | { kind: 'goalsCompleted'; target: number };

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name rendered by the achievement card. */
  icon: string;
  xpReward: number;
  attributeWeights: Partial<Record<keyof Record<string, number>, number>> & {
    strength?: number;
    endurance?: number;
    mobility?: number;
    technical?: number;
    problemSolving?: number;
    discipline?: number;
  };
  rule: AchievementRule;
}

export interface AchievementContext {
  stats: ProgressionStats;
  lessons: LearningProgress[];
  assignments: QuestAssignment[];
  journal: JournalEntry[];
  focusSessions: FocusSession[];
  goals: UserGoal[];
  transactions: XpTransaction[];
  templateById: (templateId: string) => QuestTemplate | null;
}

const RANK_ORDER: RankTier[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];

export function evaluateAchievement(
  def: AchievementDefinition,
  ctx: AchievementContext,
): boolean {
  const rule = def.rule;
  switch (rule.kind) {
    case 'completedQuests':
      return ctx.stats.completedQuests >= rule.target;
    case 'activeDays':
      return ctx.stats.distinctActiveDays >= rule.target;
    case 'pathQuests':
      return ctx.stats.questsByPath[rule.path] >= rule.target;
    case 'workouts':
      return ctx.stats.workoutsLogged >= rule.target;
    case 'lessons': {
      const done = ctx.lessons.filter(
        (l) => l.state === 'completed' && (!rule.paths || rule.paths.some((p) => l.lessonId.startsWith(p))),
      );
      return done.length >= rule.target;
    }
    case 'quizPassed':
      return ctx.lessons.some(
        (l) =>
          l.lessonId.startsWith(rule.pathPrefix) &&
          l.state === 'completed' &&
          (l.quizScore ?? 0) >= rule.minScore,
      );
    case 'reflections':
      return ctx.journal.length >= rule.target;
    case 'focusMinutes':
      return ctx.stats.focusMinutes >= rule.target;
    case 'streak':
      return Math.max(ctx.stats.currentStreak, ctx.stats.longestStreak) >= rule.target;
    case 'rankAtLeast':
      return RANK_ORDER.indexOf(ctx.stats.rank) >= RANK_ORDER.indexOf(rule.tier);
    case 'challenges': {
      const count = ctx.assignments.filter((a) => {
        if (a.status !== 'completed') return false;
        const t = ctx.templateById(a.templateId);
        return !!t && t.cadence === 'weekly';
      }).length;
      return count >= rule.target;
    }
    case 'balanced':
      return (
        ctx.stats.questsByPath.vitality >= rule.target &&
        ctx.stats.questsByPath.intelligence >= rule.target &&
        ctx.stats.questsByPath.discipline >= rule.target
      );
    case 'goalsCompleted':
      return ctx.goals.filter((g) => g.status === 'completed').length >= rule.target;
  }
}

/** Definitions the user has not earned yet that now qualify. */
export function pendingAchievements(
  definitions: AchievementDefinition[],
  ctx: AchievementContext,
  ownedIds: Set<string>,
): AchievementDefinition[] {
  return definitions.filter((def) => !ownedIds.has(def.id) && evaluateAchievement(def, ctx));
}
