/**
 * Core domain types shared by the progression engine, the UI and both
 * persistence adapters (local + Supabase). The Supabase table shapes in
 * `supabase/migrations` mirror these names.
 */

export type DevelopmentPath = 'vitality' | 'intelligence' | 'discipline';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestCadence = 'daily' | 'weekly';
export type QuestStatus = 'available' | 'in_progress' | 'completed' | 'expired' | 'skipped';

export type AttributeKey =
  | 'strength'
  | 'endurance'
  | 'mobility'
  | 'technical'
  | 'problemSolving'
  | 'discipline';

export type RankTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';

export type SkillState = 'locked' | 'available' | 'in_progress' | 'completed';

export type XpSourceType =
  | 'quest'
  | 'lesson'
  | 'workout'
  | 'focus'
  | 'challenge'
  | 'achievement'
  | 'correction';

export type ProgressionEventType =
  | 'xp_awarded'
  | 'level_up'
  | 'rank_up'
  | 'achievement_earned'
  | 'quest_completed'
  | 'lesson_completed'
  | 'workout_logged'
  | 'streak_milestone'
  | 'skill_completed'
  | 'onboarding_completed'
  | 'admin_correction';

export interface UserPreferences {
  /** Preferred quest difficulty; 'adaptive' mixes based on level. */
  difficulty: Difficulty | 'adaptive';
  dailyQuestCount: number;
  activePaths: DevelopmentPath[];
  trainingIntensity: 'light' | 'moderate' | 'rigorous';
  dailyMinutes: number;
  fitnessLevel: 'new' | 'returning' | 'regular';
  techLevel: 'new' | 'some' | 'comfortable';
  /** Weekday indexes (0 = Sunday) on which the user plans not to train. */
  restDays: number[];
  reducedMotion: boolean;
  accent: 'violet' | 'indigo' | 'cyan';
  surface: 'midnight' | 'amoled';
  /** Preference only — ARISE does not send reminders in this version. */
  remindersEnabled: boolean;
  reminderTime: string;
  soundEnabled: boolean;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  path: DevelopmentPath;
  difficulty: Difficulty;
  cadence: QuestCadence;
  durationMinutes: number;
  instructions: string[];
  criteria: string[];
  /** Overrides the difficulty default when present. */
  xpReward?: number;
  /** Used for eligibility (level gating) and prerequisites. */
  minLevel?: number;
  requiresSkills?: string[];
  /** How many times the user has completed this template historically. */
  tags: string[];
  /** Completion needs an explicit confirmation step (irreversible). */
  confirmRequired?: boolean;
  attributeWeights: Partial<Record<AttributeKey, number>>;
  /** Optional XP award for weekly challenges (75–150 range). */
  challenge?: boolean;
}

export interface QuestAssignment {
  id: string;
  ownerId: string;
  templateId: string;
  /** Day key in the owner's time zone. */
  assignedDate: string;
  cadence: QuestCadence;
  status: QuestStatus;
  xpAwarded?: number;
  acceptedAt?: string | null;
  completedAt?: string | null;
  evidence?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface XpTransaction {
  id: string;
  ownerId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceRef: string;
  sourceLabel: string;
  /** Unique per owner — the idempotency guard for reward operations. */
  idempotencyKey: string;
  attributeWeights: Partial<Record<AttributeKey, number>>;
  createdAt: string;
}

export interface AttributeSnapshot {
  ownerId: string;
  attribute: AttributeKey;
  /** Derived score 0–100 (see core/attributes.ts). */
  value: number;
  /** Attribute XP accumulator. */
  xp: number;
  milestoneIndex: number;
  updatedAt: string;
}

export interface UserSkill {
  ownerId: string;
  skillId: string;
  state: SkillState;
  unlockedAt?: string | null;
  completedAt?: string | null;
}

export interface UserAchievement {
  id: string;
  ownerId: string;
  achievementId: string;
  earnedAt: string;
}

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: string;
  durationSeconds?: number;
  note?: string;
}

export interface WorkoutSession {
  id: string;
  ownerId: string;
  date: string;
  templateId?: string | null;
  title: string;
  path: DevelopmentPath;
  focus: string[];
  durationMinutes: number;
  intensity: 'light' | 'moderate' | 'vigorous';
  exercises: WorkoutExercise[];
  notes?: string;
  createdAt: string;
}

export interface LearningProgress {
  ownerId: string;
  lessonId: string;
  state: 'not_started' | 'in_progress' | 'completed';
  quizScore?: number | null;
  quizAttempts: number;
  notes?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  ownerId: string;
  date: string;
  content: string;
  prompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  ownerId: string;
  date: string;
  minutes: number;
  label: string;
  completed: boolean;
  createdAt: string;
}

export interface UserGoal {
  id: string;
  ownerId: string;
  path: DevelopmentPath;
  title: string;
  target: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

export interface ProgressionEvent {
  id: string;
  ownerId: string;
  type: ProgressionEventType;
  title: string;
  detail?: string;
  payload?: Record<string, unknown>;
  /** Stable key that prevents the same milestone from being recorded twice. */
  dedupeKey?: string;
  createdAt: string;
}

export interface LearningLesson {
  id: string;
  pathId: string;
  order: number;
  title: string;
  summary: string;
  objectives: string[];
  minutes: number;
  xpReward: number;
  sections: { heading: string; body: string[]; code?: string }[];
  exercise: string;
  quiz: { question: string; options: string[]; answerIndex: number }[];
  takeaways: string[];
}

/** Everything the app needs to render a user on first paint. */
export interface Bootstrap {
  profile: Profile;
  assignments: QuestAssignment[];
  transactions: XpTransaction[];
  attributes: AttributeSnapshot[];
  skills: UserSkill[];
  achievements: UserAchievement[];
  workouts: WorkoutSession[];
  lessons: LearningProgress[];
  journal: JournalEntry[];
  focusSessions: FocusSession[];
  goals: UserGoal[];
  events: ProgressionEvent[];
}

/** Aggregate statistics used by ranks, achievements and streaks. */
export interface ProgressionStats {
  totalXp: number;
  level: number;
  completedQuests: number;
  distinctActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  questsByPath: Record<DevelopmentPath, number>;
  lessonsCompleted: number;
  workoutsLogged: number;
  reflectionsLogged: number;
  focusMinutes: number;
  achievementsEarned: number;
  rank: RankTier;
}
