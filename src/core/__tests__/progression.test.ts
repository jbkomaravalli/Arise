import { describe, expect, it } from 'vitest';
import { ENGINE_DEPS } from '@/content';
import {
  addJournalInState,
  applyDailySyncInState,
  completeLessonInState,
  completeQuestInState,
  recordFocusInState,
  recordWorkoutInState,
  statsFor,
} from '../progression';
import { planDailySync } from '../quests';
import { defaultPreferences } from '@/lib/defaults';
import { todayKey } from '@/lib/time';
import type { Bootstrap, Profile, QuestAssignment } from '../types';

const NOW = new Date('2026-10-15T12:00:00Z');
const TZ = 'UTC';
const TODAY = todayKey(TZ, NOW);

function profile(patch: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    email: 'hunter@example.com',
    displayName: 'Test Hunter',
    timezone: TZ,
    onboardingCompleted: true,
    preferences: defaultPreferences(),
    createdAt: '2026-10-01T00:00:00.000Z',
    ...patch,
  };
}

function emptyState(patch: Partial<Bootstrap> = {}): Bootstrap {
  return {
    profile: profile(),
    assignments: [],
    transactions: [],
    attributes: [],
    skills: [],
    achievements: [],
    workouts: [],
    lessons: [],
    journal: [],
    focusSessions: [],
    goals: [],
    events: [],
    ...patch,
  };
}

/** State with a deterministic daily set already assigned. */
function seededState(): Bootstrap {
  const plan = planDailySync({
    ownerId: 'u1',
    dayKey: TODAY,
    templates: Object.values(ENGINE_DEPS.templates),
    preferences: defaultPreferences(),
    level: 1,
    completedSkillIds: new Set(),
    assignments: [],
    now: NOW,
  });
  return applyDailySyncInState(emptyState(), plan, NOW);
}

describe('quest completion', () => {
  it('awards exactly the configured XP once', () => {
    const state = seededState();
    const target = state.assignments.find((a) => a.cadence === 'daily')!;
    const template = ENGINE_DEPS.templates[target.templateId];

    const result = completeQuestInState(state, ENGINE_DEPS, {
      assignmentId: target.id,
      dayKey: TODAY,
      now: NOW,
    });

    expect(result.blocked).toBeUndefined();
    const expectedXp =
      template.xpReward ?? (template.difficulty === 'easy' ? 10 : template.difficulty === 'medium' ? 25 : 50);

    // The quest transaction pays exactly the configured reward…
    const questTx = result.state.transactions.find((t) => t.idempotencyKey === `quest:${target.id}`);
    expect(questTx?.amount).toBe(expectedXp);

    // …and the total also includes any achievement XP awarded in the same
    // transaction (First Awakening fires on the first completed quest).
    const achievementXp = result.newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
    expect(result.xpGained).toBe(expectedXp + achievementXp);
    expect(result.state.assignments.find((a) => a.id === target.id)?.status).toBe('completed');
  });

  it('is idempotent: repeating the same completion pays nothing extra (Journey C)', () => {
    const state = seededState();
    const target = state.assignments.find((a) => a.cadence === 'daily')!;

    const first = completeQuestInState(state, ENGINE_DEPS, { assignmentId: target.id, dayKey: TODAY, now: NOW });
    const second = completeQuestInState(first.state, ENGINE_DEPS, {
      assignmentId: target.id,
      dayKey: TODAY,
      now: NOW,
    });

    expect(second.duplicate).toBe(true);
    expect(second.xpGained).toBe(0);
    expect(second.state.transactions).toHaveLength(first.state.transactions.length);
    expect(second.state.assignments.filter((a) => a.id === target.id)).toHaveLength(1);
  });

  it('refuses completion for expired assignments', () => {
    const state = seededState();
    const target = state.assignments.find((a) => a.cadence === 'daily')!;
    const expired: QuestAssignment = {
      ...target,
      id: 'qa-expired-1',
      assignedDate: '2026-10-14',
      status: 'expired',
    };
    const withExpired: Bootstrap = { ...state, assignments: [...state.assignments, expired] };

    const result = completeQuestInState(withExpired, ENGINE_DEPS, {
      assignmentId: expired.id,
      dayKey: TODAY,
      now: NOW,
    });
    expect(result.blocked?.reason).toBe('expired');
    expect(result.xpGained).toBe(0);
  });

  it('refuses quests owned by another user', () => {
    const state = seededState();
    const target = state.assignments.find((a) => a.cadence === 'daily')!;
    const foreign: QuestAssignment = { ...target, id: 'qa-foreign-1', ownerId: 'someone-else' };
    const withForeign: Bootstrap = { ...state, assignments: [...state.assignments, foreign] };

    const result = completeQuestInState(withForeign, ENGINE_DEPS, {
      assignmentId: foreign.id,
      dayKey: TODAY,
      now: NOW,
    });
    expect(result.blocked?.reason).toBe('forbidden');
  });

  it('records a quest_completed event exactly once', () => {
    const state = seededState();
    const target = state.assignments.find((a) => a.cadence === 'daily')!;
    const first = completeQuestInState(state, ENGINE_DEPS, { assignmentId: target.id, dayKey: TODAY, now: NOW });
    const second = completeQuestInState(first.state, ENGINE_DEPS, {
      assignmentId: target.id,
      dayKey: TODAY,
      now: NOW,
    });
    const questEvents = second.state.events.filter((e) => e.dedupeKey === `quest:${target.id}`);
    expect(questEvents).toHaveLength(1);
  });

  it('unlocks First Awakening exactly once with its XP', () => {
    const state = seededState();
    const target = state.assignments.find((a) => a.cadence === 'daily')!;
    const first = completeQuestInState(state, ENGINE_DEPS, { assignmentId: target.id, dayKey: TODAY, now: NOW });

    expect(first.newAchievements.map((a) => a.id)).toContain('first_awakening');
    const achievementTx = first.state.transactions.filter((t) => t.idempotencyKey === 'achievement:first_awakening');
    expect(achievementTx).toHaveLength(1);

    // A second quest does not pay First Awakening again.
    const secondTarget = first.state.assignments.find(
      (a) => a.cadence === 'daily' && a.id !== target.id && a.status === 'available',
    )!;
    const second = completeQuestInState(first.state, ENGINE_DEPS, {
      assignmentId: secondTarget.id,
      dayKey: TODAY,
      now: NOW,
    });
    expect(second.state.transactions.filter((t) => t.idempotencyKey === 'achievement:first_awakening')).toHaveLength(1);
  });

  it('levels up and emits a deduped milestone event', () => {
    // Seed enough XP that the next quest crosses level 2 (100 XP threshold).
    const transactions = Array.from({ length: 9 }, (_, i) => ({
      id: `seed-${i}`,
      ownerId: 'u1',
      amount: 10,
      sourceType: 'quest' as const,
      sourceRef: `seed-${i}`,
      sourceLabel: 'Seed',
      idempotencyKey: `seed:${i}`,
      attributeWeights: { discipline: 1 },
      createdAt: '2026-10-14T10:00:00.000Z',
    }));
    const state: Bootstrap = { ...seededState(), transactions };
    const target = state.assignments.find((a) => a.cadence === 'daily')!;

    const result = completeQuestInState(state, ENGINE_DEPS, { assignmentId: target.id, dayKey: TODAY, now: NOW });

    expect(result.levelAfter).toBeGreaterThan(result.levelBefore);
    expect(result.state.events.some((e) => e.type === 'level_up' && e.dedupeKey === `levelup:${result.levelAfter}`)).toBe(true);
  });
});

describe('lessons, training and reflections', () => {
  it('pays lesson XP once, and refreshes quiz scores on retake', () => {
    const first = completeLessonInState(emptyState(), ENGINE_DEPS, {
      lessonId: 'linux-01-navigate',
      quizScore: 100,
      now: NOW,
    });
    expect(first.xpGained).toBeGreaterThan(0);
    expect(first.state.lessons[0].state).toBe('completed');

    const retake = completeLessonInState(first.state, ENGINE_DEPS, {
      lessonId: 'linux-01-navigate',
      quizScore: 67,
      now: NOW,
    });
    expect(retake.duplicate).toBe(true);
    expect(retake.xpGained).toBe(0);
    expect(retake.state.lessons[0].quizScore).toBe(67);
    expect(retake.state.transactions).toHaveLength(first.state.transactions.length);
  });

  it('rejects unknown lessons', () => {
    const result = completeLessonInState(emptyState(), ENGINE_DEPS, { lessonId: 'nope', now: NOW });
    expect(result.blocked?.reason).toBe('not-found');
  });

  it('logs workouts with intensity-based XP and updates stats', () => {
    const session = {
      id: 'ws_test_1',
      ownerId: 'u1',
      date: TODAY,
      templateId: 'w-full-body-foundation',
      title: 'Full-body foundation',
      path: 'vitality' as const,
      focus: ['strength'],
      durationMinutes: 30,
      intensity: 'moderate' as const,
      exercises: [{ name: 'Push-ups', sets: 3, reps: '8' }],
      createdAt: `${TODAY}T12:00:00.000Z`,
    };
    const result = recordWorkoutInState(emptyState(), ENGINE_DEPS, { session, now: NOW });
    expect(result.xpGained).toBe(30);
    expect(result.state.workouts).toHaveLength(1);

    const duplicate = recordWorkoutInState(result.state, ENGINE_DEPS, { session, now: NOW });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.xpGained).toBe(0);
  });

  it('pays reflection XP once per day', () => {
    const first = addJournalInState(emptyState(), ENGINE_DEPS, {
      entry: { id: 'jr1', date: TODAY, content: 'Completed my first reflection honestly.' },
      now: NOW,
    });
    expect(first.xpGained).toBe(10);

    const second = addJournalInState(first.state, ENGINE_DEPS, {
      entry: { id: 'jr2', date: TODAY, content: 'A second entry on the same day, still saved.' },
      now: NOW,
    });
    expect(second.xpGained).toBe(0);
    expect(second.state.journal).toHaveLength(2);
  });

  it('caps focus XP at 40 per session', () => {
    const result = recordFocusInState(emptyState(), ENGINE_DEPS, {
      session: { id: 'fs1', date: TODAY, minutes: 120, label: 'Deep work', completed: true },
      now: NOW,
    });
    expect(result.xpGained).toBe(40);
  });

  it('does not pay for incomplete focus sessions', () => {
    const result = recordFocusInState(emptyState(), ENGINE_DEPS, {
      session: { id: 'fs2', date: TODAY, minutes: 25, label: 'Aborted', completed: false },
      now: NOW,
    });
    expect(result.xpGained).toBe(0);
    expect(result.state.focusSessions).toHaveLength(1);
  });
});

describe('stats aggregation', () => {
  it('derives totals, path counts and rank from records', () => {
    const state = seededState();
    const targets = state.assignments.filter((a) => a.cadence === 'daily').slice(0, 3);
    let current = state;
    for (const target of targets) {
      current = completeQuestInState(current, ENGINE_DEPS, {
        assignmentId: target.id,
        dayKey: TODAY,
        now: NOW,
      }).state;
    }

    const stats = statsFor(current, ENGINE_DEPS, NOW);
    expect(stats.completedQuests).toBe(3);
    expect(stats.totalXp).toBeGreaterThan(0);
    expect(stats.distinctActiveDays).toBe(1);
    const pathTotal = stats.questsByPath.vitality + stats.questsByPath.intelligence + stats.questsByPath.discipline;
    expect(pathTotal).toBe(3);
    expect(stats.rank).toBe('E');
  });
});
