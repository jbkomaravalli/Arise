import { addDays, dayOfWeek, diffDays, type DayKey, todayKey } from '@/lib/time';
import type { FocusSession, JournalEntry, QuestAssignment, UserPreferences, WorkoutSession } from './types';

export interface ActivityInput {
  assignments: QuestAssignment[];
  workouts: WorkoutSession[];
  journal: JournalEntry[];
  focusSessions: FocusSession[];
  preferences: Pick<UserPreferences, 'restDays'>;
  timezone: string;
  now?: Date;
}

/** Every day (user time zone) with at least one meaningful completed action. */
export function activeDaySet(input: ActivityInput): Set<DayKey> {
  const days = new Set<DayKey>();
  for (const a of input.assignments) {
    if (a.status === 'completed' && a.completedAt) days.add(a.assignedDate);
  }
  for (const w of input.workouts) days.add(w.date);
  for (const j of input.journal) days.add(j.date);
  for (const f of input.focusSessions) {
    if (f.completed) days.add(f.date);
  }
  return days;
}

export interface StreakResult {
  current: number;
  longest: number;
  /** True when the previous day kept the streak alive but today has no activity yet. */
  atRisk: boolean;
  lastActiveDay: DayKey | null;
}

/**
 * Streak policy (documented behaviour, unit-tested):
 *
 * - A day is *active* when the user completed at least one quest, logged a
 *   training session, logged a reflection, or completed a focus session.
 * - A configured rest day with no activity is a **grace day**: it neither
 *   advances nor breaks the streak. Rest is part of the plan.
 * - Any other inactive day breaks the streak. Today never breaks the streak
 *   while it is still in progress in the user's time zone.
 * - A broken streak never erases history — XP, quests and records remain.
 */
export function computeStreak(input: ActivityInput): StreakResult {
  const now = input.now ?? new Date();
  const today = todayKey(input.timezone, now);
  const active = activeDaySet(input);

  if (active.size === 0) {
    return { current: 0, longest: 0, atRisk: false, lastActiveDay: null };
  }

  const sorted = [...active].sort();
  const first = sorted[0];
  const lastActive = sorted[sorted.length - 1];

  const isRest = (key: DayKey) => input.preferences.restDays.includes(dayOfWeek(key));

  // Longest run over the full span from first activity to today.
  let longest = 0;
  let cursorRun = 0;
  let cursor = first;
  const totalDays = diffDays(first, today);
  for (let i = 0; i <= totalDays; i += 1) {
    if (active.has(cursor)) {
      cursorRun += 1;
      longest = Math.max(longest, cursorRun);
    } else if (isRest(cursor)) {
      // grace: run continues
    } else if (cursor === today) {
      // today is still in progress — it must not end a run
    } else {
      longest = Math.max(longest, cursorRun);
      cursorRun = 0;
    }
    cursor = addDays(cursor, 1);
  }
  longest = Math.max(longest, cursorRun);

  // Current run: walk backwards from today.
  let current = 0;
  let probe = today;
  let atRisk = false;
  const stopAt = first;
  const backSpan = diffDays(stopAt, today);
  for (let i = 0; i <= backSpan; i += 1) {
    if (active.has(probe)) {
      current += 1;
    } else if (isRest(probe)) {
      // grace day
    } else if (probe === today) {
      atRisk = current === 0;
    } else {
      break;
    }
    probe = addDays(probe, -1);
  }

  if (current === 0 && atRisk) {
    // Today is untouched but yesterday's run is still alive.
    current = streakEndingAtYesterday(active, isRest, first, today);
  }

  return { current, longest, atRisk, lastActiveDay: lastActive };
}

function streakEndingAtYesterday(
  active: Set<DayKey>,
  isRest: (k: DayKey) => boolean,
  first: DayKey,
  today: DayKey,
): number {
  let current = 0;
  let probe = addDays(today, -1);
  const backSpan = diffDays(first, probe);
  for (let i = 0; i <= backSpan; i += 1) {
    if (active.has(probe)) current += 1;
    else if (isRest(probe)) {
      // grace
    } else break;
    probe = addDays(probe, -1);
  }
  return current;
}
