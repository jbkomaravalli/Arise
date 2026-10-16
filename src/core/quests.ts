import { addDays, diffDays, type DayKey, weekStart } from '@/lib/time';
import { CHALLENGE_XP, XP_REWARDS } from './config';
import { seededSample } from './random';
import type { DevelopmentPath, QuestAssignment, QuestTemplate, UserPreferences } from './types';

/** Authoritative XP for a template — difficulty defaults with explicit overrides. */
export function xpForTemplate(template: QuestTemplate): number {
  if (typeof template.xpReward === 'number') return template.xpReward;
  return template.cadence === 'weekly'
    ? CHALLENGE_XP[template.difficulty]
    : XP_REWARDS[template.difficulty];
}

export interface DailyGenerationInput {
  ownerId: string;
  dayKey: DayKey;
  templates: QuestTemplate[];
  preferences: UserPreferences;
  level: number;
  completedSkillIds: Set<string>;
  /** Template ids used over the recent past — avoided when alternatives exist. */
  recentTemplateIds: Set<string>;
}

/**
 * Deterministic daily selection: same (owner, day, profile, library) always
 * produces the same quest set. Variety comes from a seed, never from randomness
 * at runtime.
 */
export function selectDailyTemplates(input: DailyGenerationInput): QuestTemplate[] {
  const { dayKey, ownerId, preferences, templates } = input;

  const activePaths =
    preferences.activePaths.length > 0
      ? preferences.activePaths
      : (['vitality', 'intelligence', 'discipline'] as DevelopmentPath[]);

  const eligible = templates.filter((t) => {
    if (t.cadence !== 'daily') return false;
    if (!activePaths.includes(t.path)) return false;
    if ((t.minLevel ?? 1) > input.level) return false;
    if (t.requiresSkills?.some((s) => !input.completedSkillIds.has(s))) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  const desired = Math.min(Math.max(3, preferences.dailyQuestCount), 7, eligible.length);

  // Difficulty weighting: explicit preference, or adaptive by level.
  const weightFor = (t: QuestTemplate): number => {
    const pref = preferences.difficulty;
    const level = input.level;
    let base: number;
    if (pref === 'adaptive') {
      base =
        level < 4
          ? { easy: 5, medium: 2, hard: 0.4 }[t.difficulty]
          : level < 10
            ? { easy: 3, medium: 3.5, hard: 1.2 }[t.difficulty]
            : { easy: 1.5, medium: 3, hard: 3 }[t.difficulty];
    } else if (pref === t.difficulty) {
      base = 4;
    } else {
      base = t.difficulty === 'hard' ? 1.5 : 2.5;
    }
    const novelty = input.recentTemplateIds.has(t.id) ? 0.35 : 1;
    return base * novelty;
  };

  const seed = `${ownerId}|${dayKey}`;
  const pool = seededSample(eligible, seed, eligible.length);

  // Weighted pick without replacement.
  const picked: QuestTemplate[] = [];
  const taken = new Set<string>();
  const counts: Record<DevelopmentPath, number> = { vitality: 0, intelligence: 0, discipline: 0 };

  const drawOne = (filter?: (t: QuestTemplate) => boolean): QuestTemplate | null => {
    const candidates = pool.filter((t) => !taken.has(t.id) && (!filter || filter(t)));
    if (candidates.length === 0) return null;
    const total = candidates.reduce((s, t) => s + weightFor(t), 0);
    if (total <= 0) return candidates[0];
    // Deterministic weighted choice driven by seed + draw index.
    let r = deterministicFraction(`${seed}|${picked.length}|${candidates.length}`) * total;
    for (const t of candidates) {
      r -= weightFor(t);
      if (r <= 0) return t;
    }
    return candidates[candidates.length - 1];
  };

  // Guarantee at least one quest per active path when the library allows it.
  for (const path of activePaths) {
    if (picked.length >= desired) break;
    const choice = drawOne((t) => t.path === path);
    if (choice) {
      picked.push(choice);
      taken.add(choice.id);
      counts[choice.path] += 1;
    }
  }

  while (picked.length < desired) {
    const choice = drawOne();
    if (!choice) break;
    picked.push(choice);
    taken.add(choice.id);
    counts[choice.path] += 1;
  }

  return picked;
}

function deterministicFraction(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export interface DailySyncPlan {
  /** Existing assignments whose window has passed and that stay uncompleted. */
  expire: { id: string; status: 'expired' }[];
  /** New assignments to insert (never touches existing rows). */
  create: { templateId: string; assignedDate: DayKey; cadence: 'daily' | 'weekly' }[];
  /** Today's assignments that already exist (kept untouched). */
  existingToday: QuestAssignment[];
}

/**
 * Idempotent daily synchronisation plan.
 *
 * - Never re-creates an assignment that already exists for the day/week.
 * - Never modifies completed records.
 * - Expires stale, uncompleted daily quests (no penalty; new quests appear).
 * - Weekly challenges are created once per week on the week's start day.
 */
export function planDailySync(args: {
  ownerId: string;
  dayKey: DayKey;
  templates: QuestTemplate[];
  preferences: UserPreferences;
  level: number;
  completedSkillIds: Set<string>;
  /** All assignments visible to the user (the adapter scopes them by owner). */
  assignments: QuestAssignment[];
  now?: Date;
}): DailySyncPlan {
  const { ownerId, dayKey, templates, preferences, level, assignments } = args;
  const weekKey = weekStart(dayKey);
  const nextWeekKey = addDays(weekKey, 7);

  const expire: DailySyncPlan['expire'] = [];
  for (const a of assignments) {
    if (a.status === 'completed' || a.status === 'expired' || a.status === 'skipped') continue;
    if (a.cadence === 'daily' && a.assignedDate < dayKey) {
      expire.push({ id: a.id, status: 'expired' });
    } else if (a.cadence === 'weekly' && a.assignedDate < weekKey) {
      expire.push({ id: a.id, status: 'expired' });
    } else if (a.cadence === 'weekly' && a.assignedDate >= nextWeekKey) {
      expire.push({ id: a.id, status: 'expired' });
    }
  }

  const existingToday = assignments.filter(
    (a) => a.assignedDate === dayKey && a.status !== 'expired' && a.status !== 'skipped',
  );
  const takenToday = new Set(existingToday.map((a) => a.templateId));

  const recentTemplateIds = new Set(
    assignments
      .filter((a) => diffDays(a.assignedDate, dayKey) >= 0 && diffDays(a.assignedDate, dayKey) <= 7)
      .map((a) => a.templateId),
  );

  const create: DailySyncPlan['create'] = [];

  // Idempotency rule: once today has its full complement of daily quests we
  // never add more, even though the novelty weighting would otherwise pick a
  // different (fresh) set on a later run.
  const existingDailyCount = existingToday.filter((a) => a.cadence === 'daily').length;
  const desiredDaily = Math.min(Math.max(3, preferences.dailyQuestCount), 7);

  if (existingDailyCount < desiredDaily) {
    const selected = selectDailyTemplates({
      ownerId,
      dayKey,
      templates,
      preferences,
      level,
      completedSkillIds: args.completedSkillIds,
      recentTemplateIds,
    }).filter((t) => !takenToday.has(t.id));

    for (const t of selected) {
      if (existingDailyCount + create.filter((c) => c.cadence === 'daily').length >= desiredDaily) {
        break;
      }
      create.push({ templateId: t.id, assignedDate: dayKey, cadence: 'daily' });
    }
  }

  // Weekly challenge: exactly one active per week.
  const activeWeekly = assignments.some(
    (a) =>
      a.cadence === 'weekly' &&
      a.status !== 'expired' &&
      a.assignedDate >= weekKey &&
      a.assignedDate < nextWeekKey,
  );
  if (!activeWeekly && preferences.activePaths.length > 0) {
    const weeklyPool = templates.filter(
      (t) =>
        t.cadence === 'weekly' &&
        preferences.activePaths.includes(t.path) &&
        (t.minLevel ?? 1) <= level &&
        !assignments.some((a) => a.templateId === t.id && a.cadence === 'weekly'),
    );
    const pick = seededSample(weeklyPool, `${ownerId}|${weekKey}|weekly`, 1)[0];
    if (pick) create.push({ templateId: pick.id, assignedDate: weekKey, cadence: 'weekly' });
  }

  return { expire, create, existingToday };
}

export type IneligibilityReason =
  | 'already-completed'
  | 'expired'
  | 'skipped'
  | 'not-available-yet'
  | 'level-too-low'
  | 'requires-skill';

export interface Eligibility {
  eligible: boolean;
  reason?: IneligibilityReason;
  message?: string;
}

/** Server-authoritative eligibility check for a completion request. */
export function questEligibility(args: {
  assignment: Pick<QuestAssignment, 'status' | 'assignedDate' | 'cadence'>;
  template: QuestTemplate | undefined;
  level: number;
  completedSkillIds: Set<string>;
  dayKey: DayKey;
}): Eligibility {
  const { assignment, template, level, completedSkillIds, dayKey } = args;

  if (!template) {
    return { eligible: false, reason: 'expired', message: 'This quest is no longer available.' };
  }
  if (assignment.status === 'completed') {
    return { eligible: false, reason: 'already-completed', message: 'Quest already completed.' };
  }
  if (assignment.status === 'expired') {
    return { eligible: false, reason: 'expired', message: 'This quest has expired.' };
  }
  if (assignment.status === 'skipped') {
    return { eligible: false, reason: 'skipped', message: 'This quest was skipped.' };
  }
  if (assignment.cadence === 'daily' && assignment.assignedDate > dayKey) {
    return { eligible: false, reason: 'not-available-yet', message: 'This quest opens later.' };
  }
  if (assignment.cadence === 'daily' && assignment.assignedDate < dayKey) {
    return { eligible: false, reason: 'expired', message: 'This quest has expired.' };
  }
  if ((template.minLevel ?? 1) > level) {
    return {
      eligible: false,
      reason: 'level-too-low',
      message: `Requires level ${template.minLevel}.`,
    };
  }
  const missing = template.requiresSkills?.filter((s) => !completedSkillIds.has(s)) ?? [];
  if (missing.length > 0) {
    return {
      eligible: false,
      reason: 'requires-skill',
      message: 'Complete the prerequisite skills first.',
    };
  }
  return { eligible: true };
}
