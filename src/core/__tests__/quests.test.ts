import { describe, expect, it } from 'vitest';
import { planDailySync, questEligibility, selectDailyTemplates, xpForTemplate } from '../quests';
import { QUEST_TEMPLATES } from '@/content/questTemplates';
import { defaultPreferences } from '@/lib/defaults';
import type { QuestAssignment, UserPreferences } from '../types';

const OWNER = 'user-1';
const DAY = '2026-10-15';
const WEEK = '2026-10-12';

function prefs(patch: Partial<UserPreferences> = {}): UserPreferences {
  return { ...defaultPreferences(), ...patch };
}

function assignment(patch: Partial<QuestAssignment> = {}): QuestAssignment {
  return {
    id: 'a1',
    ownerId: OWNER,
    templateId: 'v-squats',
    assignedDate: DAY,
    cadence: 'daily',
    status: 'available',
    createdAt: `${DAY}T00:00:00.000Z`,
    ...patch,
  };
}

describe('daily quest selection', () => {
  it('is deterministic for the same owner, day and profile', () => {
    const input = {
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 5,
      completedSkillIds: new Set<string>(),
      recentTemplateIds: new Set<string>(),
    };
    const first = selectDailyTemplates(input).map((t) => t.id);
    const second = selectDailyTemplates(input).map((t) => t.id);
    expect(first).toEqual(second);
  });

  it('varies by day while staying deterministic', () => {
    const build = (dayKey: string) =>
      selectDailyTemplates({
        ownerId: OWNER,
        dayKey,
        templates: QUEST_TEMPLATES,
        preferences: prefs(),
        level: 5,
        completedSkillIds: new Set<string>(),
        recentTemplateIds: new Set<string>(),
      }).map((t) => t.id);
    expect(build(DAY)).not.toEqual(build('2026-10-16'));
  });

  it('varies by owner', () => {
    const build = (ownerId: string) =>
      selectDailyTemplates({
        ownerId,
        dayKey: DAY,
        templates: QUEST_TEMPLATES,
        preferences: prefs(),
        level: 5,
        completedSkillIds: new Set<string>(),
        recentTemplateIds: new Set<string>(),
      }).map((t) => t.id);
    expect(build('user-1')).not.toEqual(build('user-2'));
  });

  it('respects active paths and the daily count', () => {
    const selected = selectDailyTemplates({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs({ activePaths: ['vitality'], dailyQuestCount: 3 }),
      level: 5,
      completedSkillIds: new Set<string>(),
      recentTemplateIds: new Set<string>(),
    });
    expect(selected.length).toBeLessThanOrEqual(3);
    expect(selected.every((t) => t.path === 'vitality')).toBe(true);
  });

  it('never selects quests above the user level or locked skills', () => {
    const selected = selectDailyTemplates({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 1,
      completedSkillIds: new Set<string>(),
      recentTemplateIds: new Set<string>(),
    });
    expect(selected.every((t) => (t.minLevel ?? 1) <= 1)).toBe(true);
    expect(selected.every((t) => (t.requiresSkills?.length ?? 0) === 0)).toBe(true);
  });

  it('only picks daily quests (never weekly challenges)', () => {
    const selected = selectDailyTemplates({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 10,
      completedSkillIds: new Set<string>(),
      recentTemplateIds: new Set<string>(),
    });
    expect(selected.every((t) => t.cadence === 'daily')).toBe(true);
  });
});

describe('daily sync plan (idempotency)', () => {
  it('creates nothing when today is already assigned', () => {
    const existing = QUEST_TEMPLATES.filter((t) => t.cadence === 'daily')
      .slice(0, 5)
      .map((t) => assignment({ templateId: t.id }));
    const plan = planDailySync({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs({ dailyQuestCount: 5 }),
      level: 5,
      completedSkillIds: new Set<string>(),
      assignments: existing,
    });
    expect(plan.create.filter((c) => c.cadence === 'daily')).toHaveLength(0);
    expect(plan.existingToday).toHaveLength(5);
  });

  it('never re-creates a completed assignment', () => {
    const completedToday = assignment({ status: 'completed', completedAt: `${DAY}T10:00:00Z` });
    const plan = planDailySync({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 5,
      completedSkillIds: new Set<string>(),
      assignments: [completedToday],
    });
    expect(plan.create.some((c) => c.templateId === completedToday.templateId)).toBe(false);
  });

  it('expires stale uncompleted dailies without touching completed ones', () => {
    const stale = assignment({ id: 'stale', assignedDate: '2026-10-14', status: 'available' });
    const staleDone = assignment({
      id: 'stale-done',
      assignedDate: '2026-10-14',
      status: 'completed',
    });
    const plan = planDailySync({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 5,
      completedSkillIds: new Set<string>(),
      assignments: [stale, staleDone],
    });
    expect(plan.expire).toEqual([{ id: 'stale', status: 'expired' }]);
  });

  it('assigns a weekly challenge once per week', () => {
    const plan = planDailySync({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 5,
      completedSkillIds: new Set<string>(),
      assignments: [],
    });
    const weekly = plan.create.filter((c) => c.cadence === 'weekly');
    expect(weekly).toHaveLength(1);
    expect(weekly[0].assignedDate).toBe(WEEK);

    // Second run the same week: the weekly already exists → not recreated.
    const existingWeekly = assignment({
      id: 'w1',
      templateId: weekly[0].templateId,
      assignedDate: WEEK,
      cadence: 'weekly',
    });
    const plan2 = planDailySync({
      ownerId: OWNER,
      dayKey: DAY,
      templates: QUEST_TEMPLATES,
      preferences: prefs(),
      level: 5,
      completedSkillIds: new Set<string>(),
      assignments: [existingWeekly],
    });
    expect(plan2.create.some((c) => c.cadence === 'weekly')).toBe(false);
  });
});

describe('quest eligibility', () => {
  const template = QUEST_TEMPLATES.find((t) => t.id === 'v-incline-pushups');

  it('allows an available quest of the right day', () => {
    const result = questEligibility({
      assignment: assignment(),
      template,
      level: 5,
      completedSkillIds: new Set(),
      dayKey: DAY,
    });
    expect(result.eligible).toBe(true);
  });

  it('blocks completed quests (duplicate protection)', () => {
    const result = questEligibility({
      assignment: assignment({ status: 'completed' }),
      template,
      level: 5,
      completedSkillIds: new Set(),
      dayKey: DAY,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('already-completed');
  });

  it('blocks expired and future assignments', () => {
    expect(
      questEligibility({
        assignment: assignment({ status: 'expired' }),
        template,
        level: 5,
        completedSkillIds: new Set(),
        dayKey: DAY,
      }).reason,
    ).toBe('expired');
    expect(
      questEligibility({
        assignment: assignment({ assignedDate: '2026-10-16' }),
        template,
        level: 5,
        completedSkillIds: new Set(),
        dayKey: DAY,
      }).reason,
    ).toBe('not-available-yet');
  });

  it('enforces level and skill prerequisites', () => {
    const gated = QUEST_TEMPLATES.find((t) => t.id === 'i-bash-script');
    expect(
      questEligibility({
        assignment: assignment({ templateId: 'i-bash-script' }),
        template: gated,
        level: 1,
        completedSkillIds: new Set(),
        dayKey: DAY,
      }).reason,
    ).toBe('level-too-low');
  });
});

describe('XP configuration', () => {
  it('uses difficulty defaults', () => {
    expect(xpForTemplate(QUEST_TEMPLATES.find((t) => t.id === 'v-squats')!)).toBe(10);
    expect(xpForTemplate(QUEST_TEMPLATES.find((t) => t.id === 'v-incline-pushups')!)).toBe(25);
    expect(xpForTemplate(QUEST_TEMPLATES.find((t) => t.id === 'v-split-squat')!)).toBe(50);
  });

  it('keeps weekly challenges in the 75–150 band', () => {
    const weekly = QUEST_TEMPLATES.filter((t) => t.cadence === 'weekly');
    expect(weekly.length).toBeGreaterThan(0);
    for (const t of weekly) {
      const xp = xpForTemplate(t);
      expect(xp).toBeGreaterThanOrEqual(75);
      expect(xp).toBeLessThanOrEqual(150);
    }
  });

  it('honours explicit overrides', () => {
    const custom = QUEST_TEMPLATES.find((t) => t.id === 'd-weekly-perfect')!;
    expect(xpForTemplate(custom)).toBe(100);
  });
});
