import { describe, expect, it } from 'vitest';
import { computeStreak } from '../streaks';
import type { FocusSession, JournalEntry, QuestAssignment, WorkoutSession } from '../types';
import { addDays, dayRange, diffDays, todayKey, weekStart } from '@/lib/time';

const TZ = 'UTC';

function completed(key: string): QuestAssignment {
  return {
    id: `qa-${key}`,
    ownerId: 'u1',
    templateId: 'v-squats',
    assignedDate: key,
    cadence: 'daily',
    status: 'completed',
    completedAt: `${key}T12:00:00.000Z`,
    createdAt: `${key}T06:00:00.000Z`,
  };
}

function base(now: Date) {
  return {
    assignments: [] as QuestAssignment[],
    workouts: [] as WorkoutSession[],
    journal: [] as JournalEntry[],
    focusSessions: [] as FocusSession[],
    preferences: { restDays: [] as number[] },
    timezone: TZ,
    now,
  };
}

describe('streak engine', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const today = todayKey(TZ, now);

  it('returns zero with no activity', () => {
    const result = computeStreak(base(now));
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it('counts consecutive active days', () => {
    const input = {
      ...base(now),
      assignments: [completed(addDays(today, -2)), completed(addDays(today, -1)), completed(today)],
    };
    const result = computeStreak(input);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('keeps yesterday’s streak alive when today has no activity yet', () => {
    const input = {
      ...base(now),
      assignments: [completed(addDays(today, -2)), completed(addDays(today, -1))],
    };
    expect(computeStreak(input).current).toBe(2);
  });

  it('breaks on a missed non-rest day', () => {
    const input = {
      ...base(now),
      assignments: [completed(addDays(today, -3)), completed(addDays(today, -2))], // yesterday missed
    };
    expect(computeStreak(input).current).toBe(0);
    expect(computeStreak(input).longest).toBe(2);
  });

  it('treats configured rest days as grace (no break)', () => {
    const d1 = addDays(today, -2);
    const restDay = addDays(today, -1); // yesterday: rest day with no activity
    const input = {
      ...base(now),
      assignments: [completed(d1), completed(today)],
      preferences: { restDays: [new Date(restDay + 'T12:00:00Z').getUTCDay()] },
    };
    const result = computeStreak(input);
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it('counts reflection, workout and focus sessions as activity', () => {
    const yesterday = addDays(today, -1);
    const input = {
      ...base(now),
      workouts: [
        {
          id: 'w1',
          ownerId: 'u1',
          date: yesterday,
          title: 'Session',
          path: 'vitality' as const,
          focus: ['strength'],
          durationMinutes: 30,
          intensity: 'moderate' as const,
          exercises: [],
          createdAt: `${yesterday}T10:00:00.000Z`,
        },
      ],
      focusSessions: [
        {
          id: 'f1',
          ownerId: 'u1',
          date: today,
          minutes: 25,
          label: 'Deep work',
          completed: true,
          createdAt: `${today}T09:00:00.000Z`,
        },
      ],
    };
    expect(computeStreak(input).current).toBe(2);
  });
});

describe('timezone-safe day math', () => {
  it('evaluates “today” in the user time zone, not the browser zone', () => {
    const instant = new Date('2026-10-15T23:30:00Z');
    expect(todayKey('UTC', instant)).toBe('2026-10-15');
    expect(todayKey('Pacific/Auckland', instant)).toBe('2026-10-16');
    expect(todayKey('America/Los_Angeles', instant)).toBe('2026-10-15');
  });

  it('crosses DST boundaries without drift', () => {
    // US DST ends 2026-11-01; adding days across it must stay calendar-correct.
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('builds inclusive day ranges', () => {
    expect(dayRange('2026-10-13', '2026-10-15')).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);
  });

  it('computes Monday-based week starts', () => {
    expect(weekStart('2026-10-15')).toBe('2026-10-12'); // Thursday
    expect(weekStart('2026-10-12')).toBe('2026-10-12'); // Monday
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday
  });
});
