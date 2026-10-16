import type { MutationResult } from '@/core/progression';
import type { Bootstrap, Profile, UserGoal, UserPreferences, WorkoutSession } from '@/core/types';

export type RepositoryMode = 'local' | 'supabase';

export interface OnboardingPatch {
  displayName?: string;
  timezone?: string;
  preferences?: Partial<UserPreferences>;
  skipTo?: never;
}

export interface JournalInput {
  date: string;
  content: string;
  prompt?: string;
}

export interface FocusInput {
  date: string;
  minutes: number;
  label: string;
  completed: boolean;
}

export type WorkoutInput = Omit<WorkoutSession, 'ownerId' | 'createdAt'> & { createdAt?: string };

/**
 * Persistence boundary. Two implementations exist:
 *  - local: localStorage + the shared TS progression engine (offline/dev mode)
 *  - supabase: PostgreSQL with RLS + authoritative RPCs (production mode)
 *
 * Both must behave identically for the journeys covered in the test suite.
 */
export interface Repository {
  readonly mode: RepositoryMode;

  /** Loads the signed-in user's full record set. */
  load(): Promise<Bootstrap | null>;

  /** Idempotent daily/weekly assignment sync for the given day key. */
  ensureDaily(dayKey: string): Promise<Bootstrap>;

  completeQuest(input: {
    assignmentId: string;
    evidence?: string;
    notes?: string;
    dayKey: string;
  }): Promise<MutationResult>;

  acceptQuest(assignmentId: string): Promise<Bootstrap>;

  skipQuest(assignmentId: string): Promise<Bootstrap>;

  completeLesson(input: {
    lessonId: string;
    quizScore?: number;
    notes?: string;
  }): Promise<MutationResult>;

  recordWorkout(session: WorkoutInput): Promise<MutationResult>;

  addJournal(entry: JournalInput): Promise<MutationResult>;

  recordFocus(session: FocusInput): Promise<MutationResult>;

  setGoalStatus(
    goalId: string,
    status: 'active' | 'completed' | 'archived',
  ): Promise<MutationResult>;

  addGoal(input: { path: UserGoal['path']; title: string; target: string }): Promise<MutationResult>;

  savePreferences(patch: Partial<UserPreferences>): Promise<Profile>;

  updateProfile(patch: { displayName?: string; timezone?: string }): Promise<Profile>;

  completeOnboarding(patch: OnboardingPatch): Promise<Profile>;

  /** JSON export of everything the user owns. */
  exportData(): Promise<string>;

  /** Permanently removes the account and all owned records. */
  deleteAccount(): Promise<void>;
}
