-- ===========================================================================
-- ARISE — 0001_schema.sql
-- Tables, constraints, triggers and Row Level Security policies.
--
-- Security model:
--   * Every user-owned table is protected by RLS and scoped to auth.uid().
--   * Reward-bearing tables (xp_transactions, user_attributes, user_skills,
--     user_achievements, progression_events) have NO client write policies —
--     they are written exclusively by SECURITY DEFINER functions in
--     0002_progression.sql, which validate ownership and compute XP
--     server-side from quest_templates configuration.
--   * Content tables (quest_templates, achievements, skill_defs) are
--     read-only for clients.
-- ===========================================================================

begin;

-- ----------------------------------------------------------- user profiles
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  display_name        text not null default 'Hunter',
  timezone            text not null default 'UTC',
  onboarding_completed boolean not null default false,
  preferences         jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Hunter')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ goals
create table if not exists public.user_goals (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  path       text not null check (path in ('vitality', 'intelligence', 'discipline')),
  title      text not null,
  target     text not null,
  status     text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------- quest templates
create table if not exists public.quest_templates (
  id                text primary key,
  title             text not null,
  description       text not null,
  path              text not null check (path in ('vitality', 'intelligence', 'discipline')),
  difficulty        text not null check (difficulty in ('easy', 'medium', 'hard')),
  cadence           text not null default 'daily' check (cadence in ('daily', 'weekly')),
  duration_minutes  integer not null check (duration_minutes > 0),
  instructions      jsonb not null default '[]'::jsonb,
  criteria          jsonb not null default '[]'::jsonb,
  xp_reward         integer check (xp_reward is null or xp_reward >= 0),
  min_level         integer not null default 1 check (min_level >= 1),
  requires_skills   text[],
  tags              text[] not null default '{}',
  confirm_required  boolean not null default false,
  attribute_weights jsonb not null default '{}'::jsonb,
  challenge         boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------- quest assignments
create table if not exists public.quest_assignments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  template_id   text not null references public.quest_templates (id),
  assigned_date date not null,
  cadence       text not null default 'daily' check (cadence in ('daily', 'weekly')),
  status        text not null default 'available'
                  check (status in ('available', 'in_progress', 'completed', 'expired', 'skipped')),
  xp_awarded    integer,
  accepted_at   timestamptz,
  completed_at  timestamptz,
  evidence      text,
  notes         text,
  created_at    timestamptz not null default now(),
  -- One assignment per template per day per user: the idempotency guard that
  -- makes repeated daily syncs safe.
  constraint quest_assignments_unique_per_day unique (owner_id, template_id, assigned_date)
);

create index if not exists quest_assignments_owner_date_idx
  on public.quest_assignments (owner_id, assigned_date);

-- ------------------------------------------------------ xp transactions
create table if not exists public.xp_transactions (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  amount            integer not null check (amount >= 0),
  source_type       text not null check (source_type in
                    ('quest', 'lesson', 'workout', 'focus', 'challenge', 'achievement', 'correction')),
  source_ref        text not null,
  source_label      text not null,
  idempotency_key   text not null,
  attribute_weights jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  -- Reward idempotency: the same source can never pay out twice.
  constraint xp_transactions_idempotent unique (owner_id, idempotency_key)
);

create index if not exists xp_transactions_owner_created_idx
  on public.xp_transactions (owner_id, created_at);

-- -------------------------------------------------------- user attributes
create table if not exists public.user_attributes (
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  attribute       text not null check (attribute in
                  ('strength', 'endurance', 'mobility', 'technical', 'problemSolving', 'discipline')),
  value           integer not null default 0 check (value between 0 and 100),
  xp              numeric not null default 0,
  milestone_index integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (owner_id, attribute)
);

-- ------------------------------------------------------------- user skills
create table if not exists public.user_skills (
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  skill_id     text not null,
  state        text not null default 'available'
                 check (state in ('locked', 'available', 'in_progress', 'completed')),
  unlocked_at  timestamptz,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (owner_id, skill_id)
);

-- ------------------------------------------------------------ achievements
create table if not exists public.lesson_defs (
  id         text primary key,
  path_id    text not null,
  title      text not null,
  xp_reward  integer not null check (xp_reward >= 0),
  minutes    integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id                text primary key,
  name              text not null,
  description       text not null,
  icon              text not null,
  xp_reward         integer not null check (xp_reward >= 0),
  attribute_weights jsonb not null default '{}'::jsonb,
  rule              jsonb not null,
  created_at        timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  earned_at      timestamptz not null default now(),
  constraint user_achievements_unique unique (owner_id, achievement_id)
);

-- --------------------------------------------------------- skill definitions
create table if not exists public.skill_defs (
  id            text primary key,
  path          text not null check (path in ('vitality', 'intelligence', 'discipline')),
  column_index  integer not null default 0,
  row_index     integer not null default 0,
  prerequisites text[] not null default '{}',
  measure       jsonb not null,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------- workout sessions
create table if not exists public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  session_date     date not null,
  template_id      text references public.quest_templates (id),
  title            text not null,
  path             text not null default 'vitality'
                     check (path in ('vitality', 'intelligence', 'discipline')),
  focus            text[] not null default '{}',
  duration_minutes integer not null check (duration_minutes > 0),
  intensity        text not null default 'moderate'
                     check (intensity in ('light', 'moderate', 'vigorous')),
  exercises        jsonb not null default '[]'::jsonb,
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists workout_sessions_owner_date_idx
  on public.workout_sessions (owner_id, session_date);

-- ------------------------------------------------------- learning progress
create table if not exists public.learning_progress (
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id     text not null,
  state         text not null default 'in_progress'
                  check (state in ('not_started', 'in_progress', 'completed')),
  quiz_score    integer check (quiz_score is null or quiz_score between 0 and 100),
  quiz_attempts integer not null default 0,
  notes         text,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (owner_id, lesson_id)
);

-- ------------------------------------------------------- journal (private)
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  content    text not null,
  prompt     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_owner_date_idx
  on public.journal_entries (owner_id, entry_date);

-- --------------------------------------------------------- focus sessions
create table if not exists public.focus_sessions (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  session_date date not null,
  minutes      integer not null check (minutes between 1 and 600),
  label        text not null default 'Focus session',
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists focus_sessions_owner_date_idx
  on public.focus_sessions (owner_id, session_date);

-- ------------------------------------------------------ progression events
create table if not exists public.progression_events (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  title      text not null,
  detail     text,
  payload    jsonb,
  dedupe_key text,
  created_at timestamptz not null default now(),
  constraint progression_events_dedupe unique (owner_id, dedupe_key)
);

create index if not exists progression_events_owner_created_idx
  on public.progression_events (owner_id, created_at desc);

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists journal_touch on public.journal_entries;
create trigger journal_touch before update on public.journal_entries
  for each row execute function public.touch_updated_at();

drop trigger if exists learning_touch on public.learning_progress;
create trigger learning_touch before update on public.learning_progress
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================

-- Helper: user-owned tables get the standard owner-scoped policies.
-- Content tables get read-only access for authenticated users.

alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.quest_templates enable row level security;
alter table public.quest_assignments enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.user_attributes enable row level security;
alter table public.user_skills enable row level security;
alter table public.achievements enable row level security;
alter table public.lesson_defs enable row level security;
alter table public.user_achievements enable row level security;
alter table public.skill_defs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.learning_progress enable row level security;
alter table public.journal_entries enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.progression_events enable row level security;

-- profiles: users read and update their own row only.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- user_goals: full CRUD on own rows.
drop policy if exists goals_all_own on public.user_goals;
create policy goals_all_own on public.user_goals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- quest_templates: public read, no client writes.
drop policy if exists quest_templates_read on public.quest_templates;
create policy quest_templates_read on public.quest_templates
  for select to authenticated using (true);

-- achievements: public read, no client writes.
drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements
  for select to authenticated using (true);

-- skill_defs: public read, no client writes.
drop policy if exists skill_defs_read on public.skill_defs;
create policy skill_defs_read on public.skill_defs
  for select to authenticated using (true);

-- lesson_defs: public read, no client writes.
drop policy if exists lesson_defs_read on public.lesson_defs;
create policy lesson_defs_read on public.lesson_defs
  for select to authenticated using (true);

-- quest_assignments: users read their own; status changes are limited by the
-- guard trigger below, which forbids client-side completion.
drop policy if exists assignments_select_own on public.quest_assignments;
create policy assignments_select_own on public.quest_assignments
  for select using (owner_id = auth.uid());
drop policy if exists assignments_update_own on public.quest_assignments;
create policy assignments_update_own on public.quest_assignments
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Guard: XP-bearing columns may only change inside SECURITY DEFINER functions.
create or replace function public.arise_guard_assignment_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('arise.internal', true), '') <> '1' then
    if old.status = 'completed' and new.status is distinct from old.status then
      raise exception 'Completed quests cannot be reopened';
    end if;
    if new.status = 'completed'
       or new.xp_awarded is distinct from old.xp_awarded
       or new.completed_at is distinct from old.completed_at
       or new.evidence is distinct from old.evidence then
      raise exception 'Quest completion must go through arise_complete_quest()';
    end if;
    if new.owner_id <> old.owner_id
       or new.template_id <> old.template_id
       or new.assigned_date <> old.assigned_date then
      raise exception 'Quest assignments cannot be re-owned or re-dated';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists arise_guard_assignment on public.quest_assignments;
create trigger arise_guard_assignment
  before update on public.quest_assignments
  for each row execute function public.arise_guard_assignment_update();

-- Reward tables: reads only. Writes happen exclusively in SECURITY DEFINER
-- functions (which bypass RLS as the function owner).
drop policy if exists xp_select_own on public.xp_transactions;
create policy xp_select_own on public.xp_transactions
  for select using (owner_id = auth.uid());

drop policy if exists attributes_select_own on public.user_attributes;
create policy attributes_select_own on public.user_attributes
  for select using (owner_id = auth.uid());

drop policy if exists skills_select_own on public.user_skills;
create policy skills_select_own on public.user_skills
  for select using (owner_id = auth.uid());

drop policy if exists achievements_user_select_own on public.user_achievements;
create policy achievements_user_select_own on public.user_achievements
  for select using (owner_id = auth.uid());

-- workout sessions: read own; writes go through arise_log_workout so XP is
-- computed server-side (delete own is allowed for data control).
drop policy if exists workouts_select_own on public.workout_sessions;
create policy workouts_select_own on public.workout_sessions
  for select using (owner_id = auth.uid());
drop policy if exists workouts_delete_own on public.workout_sessions;
create policy workouts_delete_own on public.workout_sessions
  for delete using (owner_id = auth.uid());

-- learning progress: read own; writes through arise_complete_lesson.
drop policy if exists learning_select_own on public.learning_progress;
create policy learning_select_own on public.learning_progress
  for select using (owner_id = auth.uid());

-- journal: private to owner; can delete own entries.
drop policy if exists journal_select_own on public.journal_entries;
create policy journal_select_own on public.journal_entries
  for select using (owner_id = auth.uid());
drop policy if exists journal_delete_own on public.journal_entries;
create policy journal_delete_own on public.journal_entries
  for delete using (owner_id = auth.uid());

-- focus sessions: read own.
drop policy if exists focus_select_own on public.focus_sessions;
create policy focus_select_own on public.focus_sessions
  for select using (owner_id = auth.uid());
drop policy if exists focus_delete_own on public.focus_sessions;
create policy focus_delete_own on public.focus_sessions
  for delete using (owner_id = auth.uid());

-- progression events: read own only.
drop policy if exists events_select_own on public.progression_events;
create policy events_select_own on public.progression_events
  for select using (owner_id = auth.uid());

commit;

-- ===========================================================================
-- Verification (run in the SQL editor or psql after applying):
--   select tablename from pg_tables where schemaname = 'public' order by 1;
--   select policyname from pg_policies where schemaname = 'public' order by 1;
-- ===========================================================================
