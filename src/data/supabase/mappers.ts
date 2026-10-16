import type {
  AttributeKey,
  AttributeSnapshot,
  Bootstrap,
  DevelopmentPath,
  FocusSession,
  JournalEntry,
  LearningProgress,
  Profile,
  ProgressionEvent,
  ProgressionEventType,
  QuestAssignment,
  QuestCadence,
  QuestStatus,
  RankTier,
  SkillState,
  UserAchievement,
  UserGoal,
  UserPreferences,
  UserSkill,
  WorkoutExercise,
  WorkoutSession,
  XpSourceType,
  XpTransaction,
} from '@/core/types';
import { defaultPreferences } from '@/lib/defaults';

/** Defensive parsing: database rows are untrusted input, never assumed. */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asWeights(value: unknown): Partial<Record<AttributeKey, number>> {
  const rec = asRecord(value);
  if (!rec) return {};
  const out: Partial<Record<AttributeKey, number>> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number') out[k as AttributeKey] = v;
  }
  return out;
}

export function parsePreferences(raw: unknown): UserPreferences {
  const rec = asRecord(raw) ?? {};
  const base = defaultPreferences();
  return {
    difficulty: (rec.difficulty as UserPreferences['difficulty']) ?? base.difficulty,
    dailyQuestCount: asNumber(rec.dailyQuestCount, base.dailyQuestCount),
    activePaths: (Array.isArray(rec.activePaths) ? rec.activePaths : base.activePaths) as DevelopmentPath[],
    trainingIntensity: (rec.trainingIntensity as UserPreferences['trainingIntensity']) ?? base.trainingIntensity,
    dailyMinutes: asNumber(rec.dailyMinutes, base.dailyMinutes),
    fitnessLevel: (rec.fitnessLevel as UserPreferences['fitnessLevel']) ?? base.fitnessLevel,
    techLevel: (rec.techLevel as UserPreferences['techLevel']) ?? base.techLevel,
    restDays: Array.isArray(rec.restDays) ? (rec.restDays as number[]) : base.restDays,
    reducedMotion: asBool(rec.reducedMotion, base.reducedMotion),
    accent: (rec.accent as UserPreferences['accent']) ?? base.accent,
    surface: (rec.surface as UserPreferences['surface']) ?? base.surface,
    remindersEnabled: asBool(rec.remindersEnabled, base.remindersEnabled),
    reminderTime: asString(rec.reminderTime, base.reminderTime),
    soundEnabled: asBool(rec.soundEnabled, base.soundEnabled),
  };
}

export function parseProfile(raw: unknown, fallbackEmail: string): Profile | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  return {
    id: asString(rec.id),
    email: asString(rec.email, fallbackEmail),
    displayName: asString(rec.displayName ?? rec.display_name, 'Hunter'),
    timezone: asString(rec.timezone ?? rec.time_zone, 'UTC'),
    onboardingCompleted: asBool(rec.onboardingCompleted ?? rec.onboarding_completed, false),
    preferences: parsePreferences(rec.preferences),
    createdAt: asString(rec.createdAt ?? rec.created_at, new Date().toISOString()),
  };
}

export function parseBootstrap(raw: unknown, userId: string, email: string): Bootstrap | null {
  const root = asRecord(raw);
  if (!root) return null;

  const profile = parseProfile(root.profile, email);
  if (!profile) return null;

  const assignments: QuestAssignment[] = asArray(root.assignments).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        templateId: asString(r.templateId ?? r.template_id),
        assignedDate: asString(r.assignedDate ?? r.assigned_date),
        cadence: asString(r.cadence, 'daily') as QuestCadence,
        status: asString(r.status, 'available') as QuestStatus,
        xpAwarded: typeof (r.xpAwarded ?? r.xp_awarded) === 'number' ? asNumber(r.xpAwarded ?? r.xp_awarded) : undefined,
        acceptedAt: asOptionalString(r.acceptedAt ?? r.accepted_at),
        completedAt: asOptionalString(r.completedAt ?? r.completed_at),
        evidence: asOptionalString(r.evidence),
        notes: asOptionalString(r.notes),
        createdAt: asString(r.createdAt ?? r.created_at),
      } satisfies QuestAssignment,
    ];
  });

  const transactions: XpTransaction[] = asArray(root.transactions).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        amount: asNumber(r.amount),
        sourceType: asString(r.sourceType ?? r.source_type, 'quest') as XpSourceType,
        sourceRef: asString(r.sourceRef ?? r.source_ref),
        sourceLabel: asString(r.sourceLabel ?? r.source_label),
        idempotencyKey: asString(r.idempotencyKey ?? r.idempotency_key),
        attributeWeights: asWeights(r.attributeWeights ?? r.attribute_weights),
        createdAt: asString(r.createdAt ?? r.created_at),
      } satisfies XpTransaction,
    ];
  });

  const attributes: AttributeSnapshot[] = asArray(root.attributes).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        attribute: asString(r.attribute) as AttributeKey,
        value: asNumber(r.value),
        xp: asNumber(r.xp),
        milestoneIndex: asNumber(r.milestoneIndex ?? r.milestone_index),
        updatedAt: asString(r.updatedAt ?? r.updated_at),
      } satisfies AttributeSnapshot,
    ];
  });

  const skills: UserSkill[] = asArray(root.skills).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        skillId: asString(r.skillId ?? r.skill_id),
        state: asString(r.state, 'available') as SkillState,
        unlockedAt: asOptionalString(r.unlockedAt ?? r.unlocked_at),
        completedAt: asOptionalString(r.completedAt ?? r.completed_at),
      } satisfies UserSkill,
    ];
  });

  const achievements: UserAchievement[] = asArray(root.achievements).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        achievementId: asString(r.achievementId ?? r.achievement_id),
        earnedAt: asString(r.earnedAt ?? r.earned_at),
      } satisfies UserAchievement,
    ];
  });

  const workouts: WorkoutSession[] = asArray(root.workouts).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    const exercises: WorkoutExercise[] = asArray(r.exercises).flatMap((e) => {
      const er = asRecord(e);
      if (!er) return [];
      return [
        {
          name: asString(er.name),
          sets: typeof er.sets === 'number' ? asNumber(er.sets) : undefined,
          reps: asOptionalString(er.reps) ?? undefined,
          durationSeconds: typeof er.durationSeconds === 'number' ? asNumber(er.durationSeconds) : undefined,
          note: asOptionalString(er.note) ?? undefined,
        } satisfies WorkoutExercise,
      ];
    });
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        date: asString(r.date ?? r.session_date),
        templateId: asOptionalString(r.templateId ?? r.template_id),
        title: asString(r.title),
        path: asString(r.path, 'vitality') as DevelopmentPath,
        focus: asArray(r.focus).filter((f): f is string => typeof f === 'string'),
        durationMinutes: asNumber(r.durationMinutes ?? r.duration_minutes),
        intensity: asString(r.intensity, 'moderate') as WorkoutSession['intensity'],
        exercises,
        notes: asOptionalString(r.notes) ?? undefined,
        createdAt: asString(r.createdAt ?? r.created_at),
      } satisfies WorkoutSession,
    ];
  });

  const lessons: LearningProgress[] = asArray(root.lessons).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        lessonId: asString(r.lessonId ?? r.lesson_id),
        state: asString(r.state, 'not_started') as LearningProgress['state'],
        quizScore: typeof (r.quizScore ?? r.quiz_score) === 'number' ? asNumber(r.quizScore ?? r.quiz_score) : null,
        quizAttempts: asNumber(r.quizAttempts ?? r.quiz_attempts),
        notes: asOptionalString(r.notes),
        completedAt: asOptionalString(r.completedAt ?? r.completed_at),
        updatedAt: asString(r.updatedAt ?? r.updated_at),
      } satisfies LearningProgress,
    ];
  });

  const journal: JournalEntry[] = asArray(root.journal).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        date: asString(r.date ?? r.entry_date),
        content: asString(r.content),
        prompt: asOptionalString(r.prompt) ?? undefined,
        createdAt: asString(r.createdAt ?? r.created_at),
        updatedAt: asString(r.updatedAt ?? r.updated_at),
      } satisfies JournalEntry,
    ];
  });

  const focusSessions: FocusSession[] = asArray(root.focusSessions ?? root.focus_sessions).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        date: asString(r.date ?? r.session_date),
        minutes: asNumber(r.minutes),
        label: asString(r.label),
        completed: asBool(r.completed),
        createdAt: asString(r.createdAt ?? r.created_at),
      } satisfies FocusSession,
    ];
  });

  const goals: UserGoal[] = asArray(root.goals).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        path: asString(r.path, 'discipline') as DevelopmentPath,
        title: asString(r.title),
        target: asString(r.target),
        status: asString(r.status, 'active') as UserGoal['status'],
        createdAt: asString(r.createdAt ?? r.created_at),
      } satisfies UserGoal,
    ];
  });

  const events: ProgressionEvent[] = asArray(root.events).flatMap((item) => {
    const r = asRecord(item);
    if (!r) return [];
    return [
      {
        id: asString(r.id),
        ownerId: asString(r.ownerId ?? r.owner_id, userId),
        type: asString(r.type ?? r.event_type, 'xp_awarded') as ProgressionEventType,
        title: asString(r.title),
        detail: asOptionalString(r.detail) ?? undefined,
        payload: (asRecord(r.payload) ?? undefined) as Record<string, unknown> | undefined,
        dedupeKey: asOptionalString(r.dedupeKey ?? r.dedupe_key) ?? undefined,
        createdAt: asString(r.createdAt ?? r.created_at),
      } satisfies ProgressionEvent,
    ];
  });

  return {
    profile,
    assignments,
    transactions,
    attributes,
    skills,
    achievements,
    workouts,
    lessons,
    journal,
    focusSessions,
    goals,
    events,
  };
}

export interface RpcMutationPayload {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  rankBefore: RankTier;
  rankAfter: RankTier;
  duplicate: boolean;
  blockedReason: string | null;
  blockedMessage: string | null;
  events: ProgressionEvent[];
  newAchievementIds: string[];
}

/** Parses the JSON contract returned by the arise_* SQL functions. */
export function parseRpcMutation(raw: unknown, userId: string): RpcMutationPayload | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    xpGained: asNumber(r.xp_gained ?? r.xpGained),
    levelBefore: asNumber(r.level_before ?? r.levelBefore, 1),
    levelAfter: asNumber(r.level_after ?? r.levelAfter, 1),
    rankBefore: asString(r.rank_before ?? r.rankBefore, 'E') as RankTier,
    rankAfter: asString(r.rank_after ?? r.rankAfter, 'E') as RankTier,
    duplicate: asBool(r.duplicate),
    blockedReason: asOptionalString(r.blocked_reason ?? r.blockedReason),
    blockedMessage: asOptionalString(r.blocked_message ?? r.blockedMessage),
    events: asArray(r.events).flatMap((item) => {
      const ev = asRecord(item);
      if (!ev) return [];
      return [
        {
          id: asString(ev.id),
          ownerId: asString(ev.owner_id ?? ev.ownerId, userId),
          type: asString(ev.event_type ?? ev.type, 'xp_awarded') as ProgressionEventType,
          title: asString(ev.title),
          detail: asOptionalString(ev.detail) ?? undefined,
          payload: (asRecord(ev.payload) ?? undefined) as Record<string, unknown> | undefined,
          dedupeKey: asOptionalString(ev.dedupe_key ?? ev.dedupeKey) ?? undefined,
          createdAt: asString(ev.created_at ?? ev.createdAt, new Date().toISOString()),
        } satisfies ProgressionEvent,
      ];
    }),
    newAchievementIds: asArray(r.new_achievements ?? r.newAchievements).filter(
      (v): v is string => typeof v === 'string',
    ),
  };
}
