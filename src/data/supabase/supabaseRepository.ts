import { ACHIEVEMENT_MAP, ENGINE_DEPS } from '@/content';
import type { MutationResult } from '@/core/progression';
import { statsFor } from '@/core/progression';
import { planDailySync } from '@/core/quests';
import type { Bootstrap, Profile } from '@/core/types';
import { defaultPreferences } from '@/lib/defaults';
import type { FocusInput, JournalInput, OnboardingPatch, Repository, WorkoutInput } from '../repository';
import { getSupabase } from './client';
import { parseBootstrap, parseProfile, parseRpcMutation, type RpcMutationPayload } from './mappers';

/**
 * Supabase repository — production data path.
 *
 * Reads go through one `arise_bootstrap()` RPC (RLS-scoped to the caller);
 * every write goes through an authoritative `arise_*` PostgreSQL function
 * that validates ownership, computes XP from server-side configuration and
 * enforces idempotency with unique keys. The browser never decides rewards.
 */
export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;

  constructor(
    private readonly userId: string,
    private readonly email: string,
  ) {}

  private client() {
    return getSupabase();
  }

  async load(): Promise<Bootstrap | null> {
    const { data, error } = await this.client().rpc('arise_bootstrap');
    if (error) {
      if (error.message?.includes('could not find function')) {
        throw new Error(
          'The ARISE database schema is missing. Apply supabase/migrations to your project, then reload.',
        );
      }
      throw new Error(error.message);
    }
    return parseBootstrap(data, this.userId, this.email);
  }

  private async rpc(name: string, args: Record<string, unknown>): Promise<RpcMutationPayload> {
    const { data, error } = await this.client().rpc(name, args);
    if (error) throw new Error(error.message);
    const parsed = parseRpcMutation(data, this.userId);
    if (!parsed) throw new Error('The server returned an unexpected response.');
    if (parsed.blockedReason) {
      throw new Error(parsed.blockedMessage ?? 'This action is not allowed.');
    }
    return parsed;
  }

  private toMutation(
    payload: RpcMutationPayload,
    state: Bootstrap,
  ): MutationResult {
    return {
      state,
      xpGained: payload.xpGained,
      events: payload.events,
      levelBefore: payload.levelBefore,
      levelAfter: payload.levelAfter,
      rankBefore: payload.rankBefore,
      rankAfter: payload.rankAfter,
      newAchievements: payload.newAchievementIds
        .map((id) => ACHIEVEMENT_MAP[id])
        .filter((def): def is NonNullable<typeof def> => Boolean(def)),
      duplicate: payload.duplicate,
    };
  }

  private async fresh(): Promise<Bootstrap> {
    const state = await this.load();
    if (!state) throw new Error('Your profile could not be loaded.');
    return state;
  }

  async ensureDaily(dayKey: string): Promise<Bootstrap> {
    const state = await this.fresh();
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

    const { error } = await this.client().rpc('arise_sync_day', {
      p_plan: plan.create.map((c) => ({
        template_id: c.templateId,
        assigned_date: c.assignedDate,
        cadence: c.cadence,
      })),
    });
    if (error) throw new Error(error.message);
    return this.fresh();
  }

  async completeQuest(input: {
    assignmentId: string;
    evidence?: string;
    notes?: string;
  }): Promise<MutationResult> {
    const payload = await this.rpc('arise_complete_quest', {
      p_assignment_id: input.assignmentId,
      p_evidence: input.evidence ?? null,
      p_notes: input.notes ?? null,
    });
    return this.toMutation(payload, await this.fresh());
  }

  async acceptQuest(assignmentId: string): Promise<Bootstrap> {
    const { error } = await this.client()
      .from('quest_assignments')
      .update({ status: 'in_progress', accepted_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('status', 'available');
    if (error) throw new Error(error.message);
    return this.fresh();
  }

  async skipQuest(assignmentId: string): Promise<Bootstrap> {
    const { error } = await this.client()
      .from('quest_assignments')
      .update({ status: 'skipped' })
      .eq('id', assignmentId)
      .neq('status', 'completed');
    if (error) throw new Error(error.message);
    return this.fresh();
  }

  async completeLesson(input: {
    lessonId: string;
    quizScore?: number;
    notes?: string;
  }): Promise<MutationResult> {
    const payload = await this.rpc('arise_complete_lesson', {
      p_lesson_id: input.lessonId,
      p_quiz_score: input.quizScore ?? null,
      p_notes: input.notes ?? null,
    });
    return this.toMutation(payload, await this.fresh());
  }

  async recordWorkout(session: WorkoutInput): Promise<MutationResult> {
    const payload = await this.rpc('arise_log_workout', {
      p_date: session.date,
      p_title: session.title,
      p_path: session.path,
      p_focus: session.focus,
      p_duration: session.durationMinutes,
      p_intensity: session.intensity,
      p_exercises: session.exercises,
      p_notes: session.notes ?? null,
      p_template_id: session.templateId ?? null,
    });
    return this.toMutation(payload, await this.fresh());
  }

  async addJournal(entry: JournalInput): Promise<MutationResult> {
    const payload = await this.rpc('arise_log_reflection', {
      p_date: entry.date,
      p_content: entry.content,
      p_prompt: entry.prompt ?? null,
    });
    return this.toMutation(payload, await this.fresh());
  }

  async recordFocus(session: FocusInput): Promise<MutationResult> {
    const payload = await this.rpc('arise_log_focus', {
      p_date: session.date,
      p_minutes: session.minutes,
      p_label: session.label,
      p_completed: session.completed,
    });
    return this.toMutation(payload, await this.fresh());
  }

  async setGoalStatus(
    goalId: string,
    status: 'active' | 'completed' | 'archived',
  ): Promise<MutationResult> {
    const payload = await this.rpc('arise_set_goal_status', {
      p_goal_id: goalId,
      p_status: status,
    });
    return this.toMutation(payload, await this.fresh());
  }

  async addGoal(input: {
    path: 'vitality' | 'intelligence' | 'discipline';
    title: string;
    target: string;
  }): Promise<MutationResult> {
    const { error } = await this.client().from('user_goals').insert({
      owner_id: this.userId,
      path: input.path,
      title: input.title,
      target: input.target,
      status: 'active',
    });
    if (error) throw new Error(error.message);
    const state = await this.fresh();
    const stats = statsFor(state, ENGINE_DEPS, new Date());
    return {
      state,
      xpGained: 0,
      events: [],
      levelBefore: stats.level,
      levelAfter: stats.level,
      rankBefore: stats.rank,
      rankAfter: stats.rank,
      newAchievements: [],
    };
  }

  async savePreferences(patch: Partial<Profile['preferences']>): Promise<Profile> {
    const current = await this.fresh();
    const preferences = { ...defaultPreferences(), ...current.profile.preferences, ...patch };
    const { data, error } = await this.client()
      .from('profiles')
      .update({ preferences, updated_at: new Date().toISOString() })
      .eq('id', this.userId)
      .select('id, email, display_name, timezone, onboarding_completed, preferences, created_at')
      .single();
    if (error) throw new Error(error.message);
    const profile = parseProfile(data, this.email);
    if (!profile) throw new Error('Profile update returned an unexpected shape.');
    return profile;
  }

  async updateProfile(patch: { displayName?: string; timezone?: string }): Promise<Profile> {
    const current = await this.fresh();
    const { data, error } = await this.client()
      .from('profiles')
      .update({
        display_name: patch.displayName?.trim() || current.profile.displayName,
        timezone: patch.timezone || current.profile.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.userId)
      .select('id, email, display_name, timezone, onboarding_completed, preferences, created_at')
      .single();
    if (error) throw new Error(error.message);
    const profile = parseProfile(data, this.email);
    if (!profile) throw new Error('Profile update returned an unexpected shape.');
    return profile;
  }

  async completeOnboarding(patch: OnboardingPatch): Promise<Profile> {
    const current = await this.fresh();
    const preferences = { ...defaultPreferences(), ...current.profile.preferences, ...patch.preferences };
    const { data, error } = await this.client()
      .from('profiles')
      .update({
        display_name: patch.displayName?.trim() || current.profile.displayName,
        timezone: patch.timezone || current.profile.timezone,
        preferences,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.userId)
      .select('id, email, display_name, timezone, onboarding_completed, preferences, created_at')
      .single();
    if (error) throw new Error(error.message);
    const profile = parseProfile(data, this.email);
    if (!profile) throw new Error('Onboarding update returned an unexpected shape.');
    return profile;
  }

  async exportData(): Promise<string> {
    const state = await this.fresh();
    return JSON.stringify(state, null, 2);
  }

  async deleteAccount(): Promise<void> {
    const { error } = await this.client().rpc('arise_delete_account');
    if (error) throw new Error(error.message);
  }
}
