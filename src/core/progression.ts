/**
 * ARISE progression engine — the single authoritative implementation of XP
 * awarding, level/rank milestones, achievements, skill derivation and
 * attribute snapshots.
 *
 * It is a pure function layer over the user's records: given a `Bootstrap`
 * state it returns a new state. The local adapter executes it directly; the
 * Supabase adapter executes the equivalent PostgreSQL RPCs (see
 * `supabase/migrations/0002_progression.sql`), which follow the same rules:
 * idempotency keys on every reward, computed XP never taken from the client,
 * and milestone events guarded by unique dedupe keys.
 */
import {
  attributeSnapshots,
  computeAttributeScores,
} from './attributes';
import {
  pendingAchievements,
  type AchievementContext,
  type AchievementDefinition,
} from './achievements';
import { CHALLENGE_XP, XP_REWARDS } from './config';
import { questEligibility, xpForTemplate } from './quests';
import { computeSkillStates, type SkillDefinition } from './skills';
import { computeStats, type StatsSource } from './stats';
import type {
  AttributeKey,
  Bootstrap,
  FocusSession,
  JournalEntry,
  LearningLesson,
  LearningProgress,
  ProgressionEvent,
  ProgressionStats,
  QuestAssignment,
  RankTier,
  UserSkill,
  WorkoutSession,
  XpTransaction,
} from './types';

export interface EngineDeps {
  templates: Record<string, import('./types').QuestTemplate>;
  achievements: AchievementDefinition[];
  skills: SkillDefinition[];
  lessons: Record<string, LearningLesson>;
}

export interface MutationResult {
  state: Bootstrap;
  /** Total XP added by this mutation (0 for duplicates). */
  xpGained: number;
  /** New events produced by this mutation. */
  events: ProgressionEvent[];
  levelBefore: number;
  levelAfter: number;
  rankBefore: RankTier;
  rankAfter: RankTier;
  newAchievements: AchievementDefinition[];
  /** True when the request was already applied (retry / double click). */
  duplicate?: boolean;
  /** Set when the operation was refused. */
  blocked?: { reason: string; message: string };
}

const EVENT_CAP = 400;

function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

function statsSource(
  state: Bootstrap,
  deps: EngineDeps,
  now: Date,
): StatsSource {
  return {
    profile: state.profile,
    transactions: state.transactions,
    assignments: state.assignments,
    achievements: state.achievements,
    lessons: state.lessons,
    workouts: state.workouts,
    journal: state.journal,
    focusSessions: state.focusSessions,
    goals: state.goals,
    templatePath: (id) => deps.templates[id]?.path ?? null,
    now,
  };
}

export function statsFor(state: Bootstrap, deps: EngineDeps, now: Date): ProgressionStats {
  return computeStats(statsSource(state, deps, now));
}

function achievementContext(
  state: Bootstrap,
  deps: EngineDeps,
  stats: ProgressionStats,
): AchievementContext {
  return {
    stats,
    lessons: state.lessons,
    assignments: state.assignments,
    journal: state.journal,
    focusSessions: state.focusSessions,
    goals: state.goals,
    transactions: state.transactions,
    templateById: (id) => deps.templates[id] ?? null,
  };
}

function addEvent(state: Bootstrap, event: ProgressionEvent): Bootstrap {
  const exists = event.dedupeKey && state.events.some((e) => e.dedupeKey === event.dedupeKey);
  if (exists) return state;
  const events = [event, ...state.events].slice(0, EVENT_CAP);
  return { ...state, events };
}

interface Award {
  amount: number;
  sourceType: XpTransaction['sourceType'];
  sourceRef: string;
  sourceLabel: string;
  attributeWeights: Partial<Record<AttributeKey, number>>;
  idempotencyKey: string;
  now: string;
}

/** Appends an XP transaction, or returns null when the key already exists. */
function awardXp(state: Bootstrap, award: Award): { state: Bootstrap; tx: XpTransaction | null } {
  if (state.transactions.some((t) => t.idempotencyKey === award.idempotencyKey)) {
    return { state, tx: null };
  }
  const tx: XpTransaction = {
    id: uid('tx'),
    ownerId: state.profile.id,
    amount: award.amount,
    sourceType: award.sourceType,
    sourceRef: award.sourceRef,
    sourceLabel: award.sourceLabel,
    idempotencyKey: award.idempotencyKey,
    attributeWeights: award.attributeWeights,
    createdAt: award.now,
  };
  return { state: { ...state, transactions: [...state.transactions, tx] }, tx };
}

interface FinalizeOptions {
  levelBefore: number;
  rankBefore: RankTier;
  sourceEvent?: ProgressionEvent;
}

/**
 * Post-mutation pipeline: achievements → skills → attribute snapshots →
 * milestone events (level, rank, streak). Everything is guarded by dedupe
 * keys so repeated evaluation never double-reports a milestone.
 */
function finalize(
  state: Bootstrap,
  deps: EngineDeps,
  now: Date,
  opts: FinalizeOptions,
): MutationResult {
  let next = state;
  let xpGained = 0;
  const events: ProgressionEvent[] = [];
  const newAchievements: AchievementDefinition[] = [];

  const record = (event: ProgressionEvent) => {
    const before = next.events.length;
    next = addEvent(next, event);
    if (next.events.length > before) events.push(event);
  };

  if (opts.sourceEvent) record(opts.sourceEvent);

  const nowIso = now.toISOString();

  // 1. Achievements (each carries an idempotent XP reward).
  let stats = statsFor(next, deps, now);
  const owned = new Set(next.achievements.map((a) => a.achievementId));
  const earned = pendingAchievements(deps.achievements, achievementContext(next, deps, stats), owned);
  for (const def of earned) {
    next = {
      ...next,
      achievements: [
        ...next.achievements,
        { id: uid('ach'), ownerId: next.profile.id, achievementId: def.id, earnedAt: nowIso },
      ],
    };
    const awarded = awardXp(next, {
      amount: def.xpReward,
      sourceType: 'achievement',
      sourceRef: def.id,
      sourceLabel: `Achievement — ${def.name}`,
      attributeWeights: def.attributeWeights,
      idempotencyKey: `achievement:${def.id}`,
      now: nowIso,
    });
    next = awarded.state;
    if (awarded.tx) {
      xpGained += awarded.tx.amount;
      newAchievements.push(def);
      record({
        id: uid('ev'),
        ownerId: next.profile.id,
        type: 'achievement_earned',
        title: `Achievement unlocked — ${def.name}`,
        detail: def.description,
        payload: { achievementId: def.id, xp: def.xpReward },
        dedupeKey: `ach:${def.id}`,
        createdAt: nowIso,
      });
    }
  }

  // 2. Skills (derived from records; completion is recorded once).
  stats = statsFor(next, deps, now);
  const attributeValues = Object.fromEntries(
    computeAttributeScores(next.transactions).map((s) => [s.attribute, s.value]),
  ) as Record<AttributeKey, number>;
  const skillViews = computeSkillStates({
    definitions: deps.skills,
    owned: next.skills,
    stats,
    attributeValues,
    lessons: next.lessons,
  });
  const ownedSkillIds = new Set(next.skills.map((s) => s.skillId));
  for (const view of skillViews) {
    if (view.state === 'completed' && !ownedSkillIds.has(view.def.id)) {
      const skill: UserSkill = {
        ownerId: next.profile.id,
        skillId: view.def.id,
        state: 'completed',
        unlockedAt: nowIso,
        completedAt: nowIso,
      };
      next = { ...next, skills: [...next.skills, skill] };
      record({
        id: uid('ev'),
        ownerId: next.profile.id,
        type: 'skill_completed',
        title: `Skill mastered — ${view.def.title}`,
        detail: view.def.summary,
        payload: { skillId: view.def.id, path: view.def.path },
        dedupeKey: `skill:${view.def.id}`,
        createdAt: nowIso,
      });
    } else if (!ownedSkillIds.has(view.def.id) && view.state !== 'locked') {
      const skill: UserSkill = {
        ownerId: next.profile.id,
        skillId: view.def.id,
        state: view.state === 'in_progress' ? 'in_progress' : 'available',
        unlockedAt: nowIso,
      };
      next = { ...next, skills: [...next.skills, skill] };
    }
  }

  // 3. Attribute snapshots (persisted so SQL tables mirror the same values).
  next = { ...next, attributes: attributeSnapshots(next.profile.id, next.transactions, nowIso) };

  // 4. Milestones.
  const finalStats = statsFor(next, deps, now);
  const levelAfter = finalStats.level;
  const rankAfter = finalStats.rank;

  if (levelAfter > opts.levelBefore) {
    record({
      id: uid('ev'),
      ownerId: next.profile.id,
      type: 'level_up',
      title: `Level up — Level ${levelAfter}`,
      detail: `Total XP: ${finalStats.totalXp}`,
      payload: { level: levelAfter, totalXp: finalStats.totalXp },
      dedupeKey: `levelup:${levelAfter}`,
      createdAt: nowIso,
    });
  }
  if (rankAfter !== opts.rankBefore) {
    record({
      id: uid('ev'),
      ownerId: next.profile.id,
      type: 'rank_up',
      title: `Rank up — ${rankAfter}`,
      detail: `You are now ${rankAfter}-ranked in the ARISE system.`,
      payload: { from: opts.rankBefore, to: rankAfter },
      dedupeKey: `rankup:${rankAfter}`,
      createdAt: nowIso,
    });
  }
  for (const milestone of [3, 7, 14, 30, 50, 100, 365]) {
    if (finalStats.currentStreak === milestone) {
      record({
        id: uid('ev'),
        ownerId: next.profile.id,
        type: 'streak_milestone',
        title: `${milestone}-day streak`,
        detail: 'Consistency is compounding.',
        payload: { days: milestone },
        dedupeKey: `streak:${milestone}`,
        createdAt: nowIso,
      });
    }
  }

  return {
    state: next,
    xpGained,
    events,
    levelBefore: opts.levelBefore,
    levelAfter,
    rankBefore: opts.rankBefore,
    rankAfter,
    newAchievements,
  };
}

function blockedResult(state: Bootstrap, deps: EngineDeps, now: Date, reason: string, message: string): MutationResult {
  const stats = statsFor(state, deps, now);
  return {
    state,
    xpGained: 0,
    events: [],
    levelBefore: stats.level,
    levelAfter: stats.level,
    rankBefore: stats.rank,
    rankAfter: stats.rank,
    newAchievements: [],
    blocked: { reason, message },
  };
}

/* ------------------------------------------------------------------ */
/* Quest completion                                                    */
/* ------------------------------------------------------------------ */

export function completeQuestInState(
  state: Bootstrap,
  deps: EngineDeps,
  input: { assignmentId: string; evidence?: string; notes?: string; dayKey: string; now?: Date },
): MutationResult {
  const now = input.now ?? new Date();
  const before = statsFor(state, deps, now);
  const assignment = state.assignments.find((a) => a.id === input.assignmentId);
  if (!assignment) {
    return blockedResult(state, deps, now, 'not-found', 'Quest assignment not found.');
  }
  if (assignment.ownerId !== state.profile.id) {
    return blockedResult(state, deps, now, 'forbidden', 'You do not own this quest.');
  }

  const template = deps.templates[assignment.templateId];
  const completedSkills = new Set(state.skills.filter((s) => s.state === 'completed').map((s) => s.skillId));
  const eligibility = questEligibility({
    assignment,
    template,
    level: before.level,
    completedSkillIds: completedSkills,
    dayKey: input.dayKey,
  });

  if (assignment.status === 'completed') {
    // Retry of an already-applied request: idempotent success, zero XP.
    return {
      state,
      xpGained: 0,
      events: [],
      levelBefore: before.level,
      levelAfter: before.level,
      rankBefore: before.rank,
      rankAfter: before.rank,
      newAchievements: [],
      duplicate: true,
    };
  }
  if (!eligibility.eligible) {
    return blockedResult(
      state,
      deps,
      now,
      eligibility.reason ?? 'ineligible',
      eligibility.message ?? 'This quest cannot be completed right now.',
    );
  }

  const tpl = template!;
  const amount = xpForTemplate(tpl);
  const nowIso = now.toISOString();

  const completedAssignment: QuestAssignment = {
    ...assignment,
    status: 'completed',
    completedAt: nowIso,
    acceptedAt: assignment.acceptedAt ?? nowIso,
    xpAwarded: amount,
    evidence: input.evidence ?? assignment.evidence ?? null,
    notes: input.notes ?? assignment.notes ?? null,
  };

  let next: Bootstrap = {
    ...state,
    assignments: state.assignments.map((a) => (a.id === assignment.id ? completedAssignment : a)),
  };

  const awarded = awardXp(next, {
    amount,
    sourceType: tpl.cadence === 'weekly' ? 'challenge' : 'quest',
    sourceRef: assignment.id,
    sourceLabel: tpl.title,
    attributeWeights: tpl.attributeWeights,
    idempotencyKey: `quest:${assignment.id}`,
    now: nowIso,
  });
  next = awarded.state;

  const result = finalize(next, deps, now, {
    levelBefore: before.level,
    rankBefore: before.rank,
    sourceEvent: {
      id: uid('ev'),
      ownerId: next.profile.id,
      type: 'quest_completed',
      title: `Quest complete — ${tpl.title}`,
      detail: `+${amount} XP · ${tpl.path.toUpperCase()} · ${tpl.difficulty}`,
      payload: { assignmentId: assignment.id, xp: amount, path: tpl.path },
      dedupeKey: `quest:${assignment.id}`,
      createdAt: nowIso,
    },
  });

  return { ...result, xpGained: result.xpGained + (awarded.tx?.amount ?? 0) };
}

/** Accepting a quest marks it in progress (still not completable twice). */
export function acceptQuestInState(
  state: Bootstrap,
  assignmentId: string,
  now: Date = new Date(),
): Bootstrap {
  return {
    ...state,
    assignments: state.assignments.map((a) =>
      a.id === assignmentId && a.status === 'available'
        ? { ...a, status: 'in_progress', acceptedAt: now.toISOString() }
        : a,
    ),
  };
}

export function skipQuestInState(state: Bootstrap, assignmentId: string): Bootstrap {
  return {
    ...state,
    assignments: state.assignments.map((a) =>
      a.id === assignmentId && a.status !== 'completed' ? { ...a, status: 'skipped' } : a,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Lessons (Academy)                                                   */
/* ------------------------------------------------------------------ */

export function completeLessonInState(
  state: Bootstrap,
  deps: EngineDeps,
  input: { lessonId: string; quizScore?: number; notes?: string; now?: Date },
): MutationResult {
  const now = input.now ?? new Date();
  const before = statsFor(state, deps, now);
  const lesson = deps.lessons[input.lessonId];
  if (!lesson) {
    return blockedResult(state, deps, now, 'not-found', 'Lesson not found.');
  }

  const existing = state.lessons.find((l) => l.lessonId === input.lessonId);
  const nowIso = now.toISOString();
  const quizScore = input.quizScore ?? existing?.quizScore ?? null;

  const progress: LearningProgress = {
    ownerId: state.profile.id,
    lessonId: input.lessonId,
    state: 'completed',
    quizScore,
    quizAttempts: (existing?.quizAttempts ?? 0) + (input.quizScore != null ? 1 : 0),
    notes: input.notes ?? existing?.notes ?? null,
    completedAt: existing?.completedAt ?? nowIso,
    updatedAt: nowIso,
  };

  const wasCompleted = existing?.state === 'completed';
  let next: Bootstrap = {
    ...state,
    lessons: existing
      ? state.lessons.map((l) => (l.lessonId === input.lessonId ? progress : l))
      : [...state.lessons, progress],
  };

  if (wasCompleted) {
    // Re-taking the quiz updates the score but never pays XP twice.
    const result = finalize(next, deps, now, {
      levelBefore: before.level,
      rankBefore: before.rank,
    });
    return { ...result, duplicate: true, xpGained: 0 };
  }

  const awarded = awardXp(next, {
    amount: lesson.xpReward,
    sourceType: 'lesson',
    sourceRef: lesson.id,
    sourceLabel: `Lesson — ${lesson.title}`,
    attributeWeights: { technical: 0.7, problemSolving: 0.3 },
    idempotencyKey: `lesson:${lesson.id}`,
    now: nowIso,
  });
  next = awarded.state;

  const result = finalize(next, deps, now, {
    levelBefore: before.level,
    rankBefore: before.rank,
    sourceEvent: {
      id: uid('ev'),
      ownerId: next.profile.id,
      type: 'lesson_completed',
      title: `Lesson complete — ${lesson.title}`,
      detail: `+${lesson.xpReward} XP${quizScore != null ? ` · Quiz ${quizScore}%` : ''}`,
      payload: { lessonId: lesson.id, xp: lesson.xpReward, quizScore },
      dedupeKey: `lesson:${lesson.id}`,
      createdAt: nowIso,
    },
  });
  return { ...result, xpGained: result.xpGained + (awarded.tx?.amount ?? 0) };
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

export const WORKOUT_XP = { light: 20, moderate: 30, vigorous: 40 } as const;

function workoutWeights(focus: string[]): Partial<Record<AttributeKey, number>> {
  const set = new Set(focus);
  if (set.has('endurance') && !set.has('strength')) return { endurance: 0.7, mobility: 0.2, discipline: 0.1 };
  if (set.has('mobility') && set.size === 1) return { mobility: 0.7, discipline: 0.2, endurance: 0.1 };
  if (set.has('strength') && set.has('endurance'))
    return { strength: 0.45, endurance: 0.4, mobility: 0.1, discipline: 0.05 };
  if (set.has('strength')) return { strength: 0.7, endurance: 0.2, discipline: 0.1 };
  return { strength: 0.4, endurance: 0.4, mobility: 0.1, discipline: 0.1 };
}

export function recordWorkoutInState(
  state: Bootstrap,
  deps: EngineDeps,
  input: { session: WorkoutSession; now?: Date },
): MutationResult {
  const now = input.now ?? new Date();
  const before = statsFor(state, deps, now);
  const nowIso = now.toISOString();
  const session = { ...input.session, createdAt: input.session.createdAt || nowIso };

  if (state.workouts.some((w) => w.id === session.id)) {
    const result = finalize(state, deps, now, { levelBefore: before.level, rankBefore: before.rank });
    return { ...result, duplicate: true, xpGained: 0 };
  }

  const amount = WORKOUT_XP[session.intensity];
  let next: Bootstrap = { ...state, workouts: [...state.workouts, session] };

  const awarded = awardXp(next, {
    amount,
    sourceType: 'workout',
    sourceRef: session.id,
    sourceLabel: session.title,
    attributeWeights: workoutWeights(session.focus),
    idempotencyKey: `workout:${session.id}`,
    now: nowIso,
  });
  next = awarded.state;

  const result = finalize(next, deps, now, {
    levelBefore: before.level,
    rankBefore: before.rank,
    sourceEvent: {
      id: uid('ev'),
      ownerId: next.profile.id,
      type: 'workout_logged',
      title: `Training logged — ${session.title}`,
      detail: `+${amount} XP · ${session.durationMinutes} min · ${session.intensity}`,
      payload: { sessionId: session.id, xp: amount },
      dedupeKey: `workout:${session.id}`,
      createdAt: nowIso,
    },
  });
  return { ...result, xpGained: result.xpGained + (awarded.tx?.amount ?? 0) };
}

/* ------------------------------------------------------------------ */
/* Discipline: reflection + focus                                      */
/* ------------------------------------------------------------------ */

export function addJournalInState(
  state: Bootstrap,
  deps: EngineDeps,
  input: { entry: Omit<JournalEntry, 'ownerId' | 'createdAt' | 'updatedAt'>; now?: Date },
): MutationResult {
  const now = input.now ?? new Date();
  const before = statsFor(state, deps, now);
  const nowIso = now.toISOString();
  const entry: JournalEntry = {
    ...input.entry,
    ownerId: state.profile.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  let next: Bootstrap = { ...state, journal: [...state.journal, entry] };

  // Reflections pay a flat 10 XP once per day — honest reflection, not volume.
  const awarded = awardXp(next, {
    amount: 10,
    sourceType: 'quest',
    sourceRef: `reflection:${entry.date}`,
    sourceLabel: 'Daily reflection',
    attributeWeights: { discipline: 1 },
    idempotencyKey: `journal:${entry.date}`,
    now: nowIso,
  });
  next = awarded.state;

  const result = finalize(next, deps, now, {
    levelBefore: before.level,
    rankBefore: before.rank,
    sourceEvent: {
      id: uid('ev'),
      ownerId: next.profile.id,
      type: 'quest_completed',
      title: 'Reflection recorded',
      detail: awarded.tx ? '+10 XP · DISCIPLINE' : 'Extra entries are saved without extra XP.',
      payload: { entryId: entry.id },
      dedupeKey: `journal:${entry.id}`,
      createdAt: nowIso,
    },
  });
  return { ...result, xpGained: result.xpGained + (awarded.tx?.amount ?? 0) };
}

export function recordFocusInState(
  state: Bootstrap,
  deps: EngineDeps,
  input: { session: Omit<FocusSession, 'ownerId' | 'createdAt'>; now?: Date },
): MutationResult {
  const now = input.now ?? new Date();
  const before = statsFor(state, deps, now);
  const nowIso = now.toISOString();
  const session: FocusSession = { ...input.session, ownerId: state.profile.id, createdAt: nowIso };

  if (state.focusSessions.some((f) => f.id === session.id)) {
    const result = finalize(state, deps, now, { levelBefore: before.level, rankBefore: before.rank });
    return { ...result, duplicate: true, xpGained: 0 };
  }

  let next: Bootstrap = { ...state, focusSessions: [...state.focusSessions, session] };

  if (session.completed) {
    const amount = Math.min(40, Math.max(5, Math.round(session.minutes * 1.5)));
    const awarded = awardXp(next, {
      amount,
      sourceType: 'focus',
      sourceRef: session.id,
      sourceLabel: `Focus — ${session.label}`,
      attributeWeights: { discipline: 1 },
      idempotencyKey: `focus:${session.id}`,
      now: nowIso,
    });
    next = awarded.state;

    const result = finalize(next, deps, now, {
      levelBefore: before.level,
      rankBefore: before.rank,
      sourceEvent: {
        id: uid('ev'),
        ownerId: next.profile.id,
        type: 'quest_completed',
        title: `Focus session complete — ${session.label}`,
        detail: `+${awarded.tx?.amount ?? 0} XP · ${session.minutes} min`,
        payload: { sessionId: session.id, minutes: session.minutes },
        dedupeKey: `focus:${session.id}`,
        createdAt: nowIso,
      },
    });
    return { ...result, xpGained: result.xpGained + (awarded.tx?.amount ?? 0) };
  }

  const result = finalize(next, deps, now, {
    levelBefore: before.level,
    rankBefore: before.rank,
  });
  return result;
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export function setGoalStatusInState(
  state: Bootstrap,
  deps: EngineDeps,
  goalId: string,
  status: 'active' | 'completed' | 'archived',
  now: Date = new Date(),
): MutationResult {
  const before = statsFor(state, deps, now);
  const next: Bootstrap = {
    ...state,
    goals: state.goals.map((g) => (g.id === goalId ? { ...g, status } : g)),
  };
  return finalize(next, deps, now, {
    levelBefore: before.level,
    rankBefore: before.rank,
  });
}

/* ------------------------------------------------------------------ */
/* Daily assignment application                                        */
/* ------------------------------------------------------------------ */

export function applyDailySyncInState(
  state: Bootstrap,
  plan: { expire: { id: string; status: 'expired' }[]; create: { templateId: string; assignedDate: string; cadence: 'daily' | 'weekly' }[] },
  now: Date = new Date(),
): Bootstrap {
  const nowIso = now.toISOString();
  const expiredIds = new Set(plan.expire.map((e) => e.id));

  let next: Bootstrap = {
    ...state,
    assignments: state.assignments.map((a) =>
      expiredIds.has(a.id) && a.status !== 'completed'
        ? { ...a, status: 'expired' as const }
        : a,
    ),
  };

  const existingKeys = new Set(next.assignments.map((a) => `${a.templateId}|${a.assignedDate}`));
  const created = plan.create
    .filter((c) => !existingKeys.has(`${c.templateId}|${c.assignedDate}`))
    .map<QuestAssignment>((c) => ({
      id: uid('qa'),
      ownerId: next.profile.id,
      templateId: c.templateId,
      assignedDate: c.assignedDate,
      cadence: c.cadence,
      status: 'available',
      createdAt: nowIso,
    }));

  if (created.length > 0) {
    next = { ...next, assignments: [...next.assignments, ...created] };
  }
  return next;
}

/** Default preference-driven XP helpers for UI copy. */
export const XP_REFERENCE = { ...XP_REWARDS, challenge: CHALLENGE_XP };
