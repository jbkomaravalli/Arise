import { describe, expect, it } from 'vitest';
import { LocalRepository } from './localRepository';
import { todayKey } from '@/lib/time';

const DAY = todayKey('UTC');

function repo(userId = 'user-a', email = 'a@example.com') {
  return new LocalRepository(userId, email);
}

describe('LocalRepository persistence', () => {
  it('creates an empty, non-onboarded profile on first load', async () => {
    const state = await repo().load();
    expect(state).not.toBeNull();
    expect(state!.profile.onboardingCompleted).toBe(false);
    expect(state!.assignments).toHaveLength(0);
  });

  it('persists data across repository instances (Journey D: refresh keeps data)', async () => {
    const first = repo();
    await first.ensureDaily(DAY);
    const before = await first.load();
    const target = before!.assignments.find((a) => a.cadence === 'daily')!;

    await first.completeQuest({ assignmentId: target.id, dayKey: DAY });

    // A brand-new instance reads the same persisted state.
    const after = await repo().load();
    expect(after!.assignments.find((a) => a.id === target.id)?.status).toBe('completed');
    expect(after!.transactions.length).toBeGreaterThan(0);
  });

  it('assigns daily quests idempotently — repeated syncs never duplicate', async () => {
    const r = repo();
    const first = await r.ensureDaily(DAY);
    const countAfterFirst = first.assignments.filter((a) => a.assignedDate === DAY).length;
    expect(countAfterFirst).toBeGreaterThan(0);

    const second = await r.ensureDaily(DAY);
    const third = await r.ensureDaily(DAY);
    expect(second.assignments.filter((a) => a.assignedDate === DAY)).toHaveLength(countAfterFirst);
    expect(third.assignments.filter((a) => a.assignedDate === DAY)).toHaveLength(countAfterFirst);
  });

  it('never duplicates XP when the same completion request is repeated (Journey C)', async () => {
    const r = repo();
    await r.ensureDaily(DAY);
    const state = await r.load();
    const target = state!.assignments.find((a) => a.cadence === 'daily')!;

    const first = await r.completeQuest({ assignmentId: target.id, dayKey: DAY });
    const second = await r.completeQuest({ assignmentId: target.id, dayKey: DAY });

    expect(second.duplicate).toBe(true);
    expect(second.xpGained).toBe(0);
    expect(second.state.transactions).toHaveLength(first.state.transactions.length);
  });

  it('isolates records between accounts (Journey E)', async () => {
    const a = repo('user-a', 'a@example.com');
    const b = repo('user-b', 'b@example.com');

    await a.ensureDaily(DAY);
    const aState = await a.load();
    const target = aState!.assignments.find((x) => x.cadence === 'daily')!;

    // B cannot complete A's assignment even if it knows the id: the record
    // simply does not exist in B's account (the engine reports not-found or
    // forbidden — both are hard refusals).
    const attempt = await b.completeQuest({ assignmentId: target.id, dayKey: DAY });
    expect(['not-found', 'forbidden']).toContain(attempt.blocked?.reason);
    expect(attempt.xpGained).toBe(0);

    // A's records are untouched and B has no XP.
    const aAfter = await a.load();
    expect(aAfter!.assignments.find((x) => x.id === target.id)?.status).toBe('available');
    const bAfter = await b.load();
    expect(bAfter!.transactions).toHaveLength(0);
    expect(bAfter!.assignments).toHaveLength(0);
  });

  it('completing a lesson pays XP once and survives reloads', async () => {
    const r = repo();
    const first = await r.completeLesson({ lessonId: 'linux-01-navigate', quizScore: 100 });
    expect(first.xpGained).toBe(25);

    const retake = await r.completeLesson({ lessonId: 'linux-01-navigate', quizScore: 50 });
    expect(retake.duplicate).toBe(true);
    expect(retake.xpGained).toBe(0);

    const reloaded = await repo().load();
    expect(reloaded!.lessons.find((l) => l.lessonId === 'linux-01-navigate')?.quizScore).toBe(50);
  });

  it('persists reflections, focus sessions and preferences', async () => {
    const r = repo();
    await r.addJournal({ date: DAY, content: 'I completed my first honest reflection today.' });
    await r.recordFocus({ date: DAY, minutes: 25, label: 'Deep work', completed: true });
    await r.savePreferences({ difficulty: 'hard', dailyQuestCount: 4 });

    const state = await repo().load();
    expect(state!.journal).toHaveLength(1);
    expect(state!.focusSessions).toHaveLength(1);
    expect(state!.profile.preferences.difficulty).toBe('hard');
    expect(state!.profile.preferences.dailyQuestCount).toBe(4);
  });

  it('completes onboarding and exports account data', async () => {
    const r = repo();
    const profile = await r.completeOnboarding({
      displayName: 'ARISE Tester',
      timezone: 'Europe/Berlin',
      preferences: { activePaths: ['intelligence'] },
    });
    expect(profile.onboardingCompleted).toBe(true);
    expect(profile.displayName).toBe('ARISE Tester');
    expect(profile.timezone).toBe('Europe/Berlin');

    const exported = JSON.parse(await r.exportData());
    expect(exported.profile.displayName).toBe('ARISE Tester');

    await r.deleteAccount();
    const afterDelete = await repo().load();
    // A fresh record set is created for the (still signed-in) local user id.
    expect(afterDelete!.profile.onboardingCompleted).toBe(false);
  });
});
