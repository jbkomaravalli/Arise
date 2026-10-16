import { todayKey, type DayKey } from '@/lib/time';
import { levelFromXp } from './level';
import { rankForStats } from './rank';
import { activeDaySet, computeStreak } from './streaks';
import type {
  DevelopmentPath,
  FocusSession,
  JournalEntry,
  LearningProgress,
  Profile,
  ProgressionStats,
  QuestAssignment,
  UserAchievement,
  UserGoal,
  WorkoutSession,
  XpTransaction,
} from './types';

export interface StatsSource {
  profile: Pick<Profile, 'timezone' | 'preferences'>;
  transactions: XpTransaction[];
  assignments: QuestAssignment[];
  achievements: UserAchievement[];
  lessons: LearningProgress[];
  workouts: WorkoutSession[];
  journal: JournalEntry[];
  focusSessions: FocusSession[];
  goals: UserGoal[];
  /** Resolves an assignment's template id to its development path. */
  templatePath: (templateId: string) => DevelopmentPath | null;
  now?: Date;
}

/** Aggregate statistics — the single source of truth for ranks/achievements. */
export function computeStats(source: StatsSource): ProgressionStats {
  const now = source.now ?? new Date();
  const timezone = source.profile.timezone;

  const totalXp = source.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const level = levelFromXp(totalXp);

  const completed = source.assignments.filter((a) => a.status === 'completed');
  const questsByPath: Record<DevelopmentPath, number> = {
    vitality: 0,
    intelligence: 0,
    discipline: 0,
  };
  for (const a of completed) {
    const p = source.templatePath(a.templateId);
    if (p) questsByPath[p] += 1;
  }

  const activity = {
    assignments: source.assignments,
    workouts: source.workouts,
    journal: source.journal,
    focusSessions: source.focusSessions,
    preferences: source.profile.preferences,
    timezone,
    now,
  };
  const activeDays = activeDaySet(activity);
  const streak = computeStreak(activity);

  const base: Omit<ProgressionStats, 'rank'> = {
    totalXp,
    level,
    completedQuests: completed.length,
    distinctActiveDays: activeDays.size,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    questsByPath,
    lessonsCompleted: source.lessons.filter((l) => l.state === 'completed').length,
    workoutsLogged: source.workouts.length,
    reflectionsLogged: source.journal.length,
    focusMinutes: source.focusSessions
      .filter((f) => f.completed)
      .reduce((s, f) => s + f.minutes, 0),
    achievementsEarned: source.achievements.length,
  };

  return { ...base, rank: rankForStats(base) };
}

/** Distinct day keys with completed quests — used by achievements. */
export function completedQuestDays(completed: QuestAssignment[]): Set<DayKey> {
  return new Set(completed.map((a) => a.assignedDate));
}

export function todayIn(profile: Pick<Profile, 'timezone'>, now?: Date): DayKey {
  return todayKey(profile.timezone, now);
}
