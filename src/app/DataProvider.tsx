import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ENGINE_DEPS } from '@/content';
import { computeStats } from '@/core/stats';
import type { MutationResult } from '@/core/progression';
import type { Bootstrap, ProgressionStats, Profile, UserPreferences } from '@/core/types';
import { createRepository } from '@/data';
import type { FocusInput, JournalInput, OnboardingPatch, Repository, WorkoutInput } from '@/data';
import { todayKey } from '@/lib/time';
import { useAuth } from './AuthProvider';

export interface DataContextValue {
  status: 'loading' | 'ready' | 'error' | 'signedOut';
  bootstrap: Bootstrap | null;
  stats: ProgressionStats | null;
  error: string | null;
  mode: Repository['mode'];
  /** Celebration payload from the most recent rewarding action, if any. */
  celebration: MutationResult | null;
  clearCelebration(): void;
  refresh(): Promise<void>;
  completeQuest(input: {
    assignmentId: string;
    evidence?: string;
    notes?: string;
  }): Promise<MutationResult>;
  acceptQuest(assignmentId: string): Promise<void>;
  skipQuest(assignmentId: string): Promise<void>;
  completeLesson(input: {
    lessonId: string;
    quizScore?: number;
    notes?: string;
  }): Promise<MutationResult>;
  recordWorkout(session: WorkoutInput): Promise<MutationResult>;
  addJournal(entry: JournalInput): Promise<MutationResult>;
  recordFocus(session: FocusInput): Promise<MutationResult>;
  setGoalStatus(goalId: string, status: 'active' | 'completed' | 'archived'): Promise<MutationResult>;
  addGoal(input: { path: 'vitality' | 'intelligence' | 'discipline'; title: string; target: string }): Promise<MutationResult>;
  savePreferences(patch: Partial<UserPreferences>): Promise<Profile | null>;
  updateProfile(patch: { displayName?: string; timezone?: string }): Promise<Profile | null>;
  completeOnboarding(patch: OnboardingPatch): Promise<Profile>;
  exportData(): Promise<string>;
  deleteAccount(): Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function todayFor(bootstrap: Bootstrap): string {
  return todayKey(bootstrap.profile.timezone);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const repoRef = useRef<Repository | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [status, setStatus] = useState<DataContextValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<MutationResult | null>(null);

  const repo = useMemo(() => {
    if (!session) return null;
    repoRef.current = createRepository(session.user.id, session.user.email);
    return repoRef.current;
  }, [session]);

  const stats = useMemo(
    () =>
      bootstrap
        ? computeStats({
            profile: bootstrap.profile,
            transactions: bootstrap.transactions,
            assignments: bootstrap.assignments,
            achievements: bootstrap.achievements,
            lessons: bootstrap.lessons,
            workouts: bootstrap.workouts,
            journal: bootstrap.journal,
            focusSessions: bootstrap.focusSessions,
            goals: bootstrap.goals,
            templatePath: (id) => ENGINE_DEPS.templates[id]?.path ?? null,
          })
        : null,
    [bootstrap],
  );

  const load = useCallback(async () => {
    if (!repo) return;
    try {
      setStatus((prev) => (prev === 'ready' ? prev : 'loading'));
      const initial = await repo.load();
      if (!initial) {
        setBootstrap(null);
        setStatus('error');
        setError('No profile record exists for this account yet.');
        return;
      }
      // Idempotent daily sync — safe to run on every load.
      const synced = await repo.ensureDaily(todayFor(initial));
      setBootstrap(synced);
      setError(null);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading your data.');
      setStatus('error');
    }
  }, [repo]);

  useEffect(() => {
    setBootstrap(null);
    setCelebration(null);
    if (!repo) {
      setStatus('signedOut');
      return;
    }
    void load();
  }, [repo, load]);

  // Apply result helper: update state and surface celebrations.
  const apply = useCallback((result: MutationResult): MutationResult => {
    setBootstrap(result.state);
    const worthCelebrating =
      result.xpGained > 0 ||
      result.levelAfter > result.levelBefore ||
      result.rankAfter !== result.rankBefore ||
      result.newAchievements.length > 0;
    if (worthCelebrating && !result.blocked) setCelebration(result);
    return result;
  }, []);

  const value = useMemo<DataContextValue>(() => {
    const guard = async <T,>(fn: () => Promise<T>): Promise<T> => {
      if (!repo) throw new Error('You are not signed in.');
      return fn();
    };

    return {
      status,
      bootstrap,
      stats,
      error,
      mode: repo?.mode ?? 'local',
      celebration,
      clearCelebration: () => setCelebration(null),
      refresh: async () => {
        await load();
      },
      completeQuest: (input) =>
        guard(async () => {
          const result = await repo!.completeQuest({
            assignmentId: input.assignmentId,
            evidence: input.evidence,
            notes: input.notes,
            dayKey: bootstrap ? todayFor(bootstrap) : todayKey(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
          });
          return apply(result);
        }),
      acceptQuest: async (assignmentId) => {
        await guard(async () => {
          const next = await repo!.acceptQuest(assignmentId);
          setBootstrap(next);
        });
      },
      skipQuest: async (assignmentId) => {
        await guard(async () => {
          const next = await repo!.skipQuest(assignmentId);
          setBootstrap(next);
        });
      },
      completeLesson: (input) =>
        guard(async () => {
          const result = await repo!.completeLesson(input);
          return apply(result);
        }),
      recordWorkout: (session) =>
        guard(async () => {
          const result = await repo!.recordWorkout(session);
          return apply(result);
        }),
      addJournal: (entry) =>
        guard(async () => {
          const result = await repo!.addJournal(entry);
          return apply(result);
        }),
      recordFocus: (session) =>
        guard(async () => {
          const result = await repo!.recordFocus(session);
          return apply(result);
        }),
      setGoalStatus: async (goalId, next) =>
        guard(async () => {
          const result = await repo!.setGoalStatus(goalId, next);
          return apply(result);
        }),
      addGoal: async (input) =>
        guard(async () => {
          const result = await repo!.addGoal(input);
          return apply(result);
        }),
      savePreferences: async (patch) => {
        if (!repo) return null;
        const profile = await repo.savePreferences(patch);
        setBootstrap((prev) => (prev ? { ...prev, profile } : prev));
        return profile;
      },
      updateProfile: async (patch) => {
        if (!repo) return null;
        const profile = await repo.updateProfile(patch);
        setBootstrap((prev) => (prev ? { ...prev, profile } : prev));
        return profile;
      },
      completeOnboarding: async (patch) => {
        if (!repo) throw new Error('You are not signed in.');
        const profile = await repo.completeOnboarding(patch);
        setBootstrap((prev) => (prev ? { ...prev, profile } : prev));
        return profile;
      },
      exportData: () => guard(() => repo!.exportData()),
      deleteAccount: () => guard(() => repo!.deleteAccount()),
    };
  }, [status, bootstrap, stats, error, repo, celebration, apply, load]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
