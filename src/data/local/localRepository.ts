import { ENGINE_DEPS } from '@/content';
import { applyDailySyncInState, completeLessonInState, completeQuestInState, recordFocusInState, recordWorkoutInState, addJournalInState, setGoalStatusInState, statsFor } from '@/core/progression';
import { planDailySync } from '@/core/quests';
import { acceptQuestInState } from '@/core/progression';
import { skipQuestInState } from '@/core/progression';
import type { MutationResult } from '@/core/progression';
import type { Bootstrap, Profile } from '@/core/types';
import type { FocusInput, JournalInput, OnboardingPatch, Repository, WorkoutInput } from '../repository';
import { KEYS, readJson, removeKey, writeJson } from './storage';

/**
 * Local repository — persists the full user record set in localStorage and
 * executes the shared TypeScript progression engine. Used when no Supabase
 * credentials are configured so the product remains fully functional offline.
 */
export class LocalRepository implements Repository {
  readonly mode = 'local' as const;

  constructor(private readonly userId: string, private readonly email: string) {}

  private key(): string {
    return KEYS.data(this.userId);
  }

  private read(): Bootstrap {
    return readJson<Bootstrap | null>(this.key(), null) ?? this.createDefault();
  }

  private write(state: Bootstrap): Bootstrap {
    writeJson(this.key(), state);
    return state;
  }

  private createDefault(): Bootstrap {
    const now = new Date().toISOString();
    const profile: Profile = {
      id: this.userId,
      email: this.email,
      displayName: this.email.split('@')[0] || 'Hunter',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      onboardingCompleted: false,
      preferences: {
        difficulty: 'adaptive',
        dailyQuestCount: 5,
        activePaths: ['vitality', 'intelligence', 'discipline'],
        trainingIntensity: 'moderate',
        dailyMinutes: 45,
        fitnessLevel: 'new',
        techLevel: 'new',
        restDays: [0],
        reducedMotion: false,
        accent: 'violet',
        surface: 'midnight',
        remindersEnabled: false,
        reminderTime: '08:00',
        soundEnabled: true,
      },
      createdAt: now,
    };
    const empty: Bootstrap = {
      profile,
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
    };
    writeJson(this.key(), empty);
    return empty;
  }

  /** Serialize read-modify-write cycles through the Web Locks API when present. */
  private async mutate<T>(fn: (state: Bootstrap) => T | Promise<T>): Promise<T> {
    const locks = (globalThis.navigator as Navigator | undefined)?.locks;
    if (locks?.request) {
      return locks.request('arise:mutate', async () => fn(this.read()));
    }
    return fn(this.read());
  }

  async load(): Promise<Bootstrap | null> {
    return this.read();
  }

  async ensureDaily(dayKey: string): Promise<Bootstrap> {
    return this.mutate((state) => {
      const now = new Date();
      const stats = statsFor(state, ENGINE_DEPS, now);
      const plan = planDailySync({
        ownerId: this.userId,
        dayKey,
        templates: Object.values(ENGINE_DEPS.templates),
        preferences: state.profile.preferences,
        level: stats.level,
        completedSkillIds: new Set(
          state.skills.filter((s) => s.state === 'completed').map((s) => s.skillId),
        ),
        assignments: state.assignments,
        now,
      });
      return this.write(applyDailySyncInState(state, plan, now));
    });
  }

  async completeQuest(input: {
    assignmentId: string;
    evidence?: string;
    notes?: string;
    dayKey: string;
  }): Promise<MutationResult> {
    const result = await this.mutate((state) => {
      const computed = completeQuestInState(state, ENGINE_DEPS, {
        assignmentId: input.assignmentId,
        evidence: input.evidence,
        notes: input.notes,
        dayKey: input.dayKey,
      });
      if (computed.state !== state) this.write(computed.state);
      return computed;
    });
    return result;
  }

  async acceptQuest(assignmentId: string): Promise<Bootstrap> {
    return this.mutate((state) => this.write(acceptQuestInState(state, assignmentId)));
  }

  async completeLesson(input: {
    lessonId: string;
    quizScore?: number;
    notes?: string;
  }): Promise<MutationResult> {
    return this.mutate((state) => {
      const computed = completeLessonInState(state, ENGINE_DEPS, {
        lessonId: input.lessonId,
        quizScore: input.quizScore,
        notes: input.notes,
      });
      if (computed.state !== state) this.write(computed.state);
      return computed;
    });
  }

  async skipQuest(assignmentId: string): Promise<Bootstrap> {
    return this.mutate((state) => this.write(skipQuestInState(state, assignmentId)));
  }

  async recordWorkout(session: WorkoutInput): Promise<MutationResult> {
    return this.mutate((state) => {
      const computed = recordWorkoutInState(state, ENGINE_DEPS, {
        session: { ...session, ownerId: this.userId, createdAt: session.createdAt ?? new Date().toISOString() },
      });
      if (computed.state !== state) this.write(computed.state);
      return computed;
    });
  }

  async addJournal(entry: JournalInput): Promise<MutationResult> {
    return this.mutate((state) => {
      const id = `jr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const computed = addJournalInState(state, ENGINE_DEPS, {
        entry: { id, date: entry.date, content: entry.content, prompt: entry.prompt },
      });
      if (computed.state !== state) this.write(computed.state);
      return computed;
    });
  }

  async recordFocus(session: FocusInput): Promise<MutationResult> {
    return this.mutate((state) => {
      const id = `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const computed = recordFocusInState(state, ENGINE_DEPS, {
        session: {
          id,
          date: session.date,
          minutes: session.minutes,
          label: session.label,
          completed: session.completed,
        },
      });
      if (computed.state !== state) this.write(computed.state);
      return computed;
    });
  }

  async setGoalStatus(
    goalId: string,
    status: 'active' | 'completed' | 'archived',
  ): Promise<MutationResult> {
    return this.mutate((state) => {
      const computed = setGoalStatusInState(state, ENGINE_DEPS, goalId, status);
      if (computed.state !== state) this.write(computed.state);
      return computed;
    });
  }

  async addGoal(input: {
    path: import('@/core/types').DevelopmentPath;
    title: string;
    target: string;
  }): Promise<MutationResult> {
    return this.mutate((state) => {
      const goal: import('@/core/types').UserGoal = {
        id: `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        ownerId: this.userId,
        path: input.path,
        title: input.title,
        target: input.target,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const next = { ...state, goals: [...state.goals, goal] };
      this.write(next);
      const stats = statsFor(next, ENGINE_DEPS, new Date());
      return {
        state: next,
        xpGained: 0,
        events: [],
        levelBefore: stats.level,
        levelAfter: stats.level,
        rankBefore: stats.rank,
        rankAfter: stats.rank,
        newAchievements: [],
      };
    });
  }

  async savePreferences(patch: Partial<Bootstrap['profile']['preferences']>): Promise<Profile> {
    const state = this.read();
    const profile: Profile = {
      ...state.profile,
      preferences: { ...state.profile.preferences, ...patch },
    };
    this.write({ ...state, profile });
    return profile;
  }

  async updateProfile(patch: { displayName?: string; timezone?: string }): Promise<Profile> {
    const state = this.read();
    const profile: Profile = {
      ...state.profile,
      displayName: patch.displayName?.trim() || state.profile.displayName,
      timezone: patch.timezone || state.profile.timezone,
    };
    this.write({ ...state, profile });
    return profile;
  }

  async completeOnboarding(patch: OnboardingPatch): Promise<Profile> {
    const state = this.read();
    const profile: Profile = {
      ...state.profile,
      displayName: patch.displayName?.trim() || state.profile.displayName,
      timezone: patch.timezone || state.profile.timezone,
      preferences: { ...state.profile.preferences, ...patch.preferences },
      onboardingCompleted: true,
    };
    this.write({ ...state, profile });
    return profile;
  }

  async exportData(): Promise<string> {
    return JSON.stringify(this.read(), null, 2);
  }

  async deleteAccount(): Promise<void> {
    removeKey(this.key());
  }
}
