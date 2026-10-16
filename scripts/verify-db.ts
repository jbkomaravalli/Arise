/**
 * Verifies the Supabase SQL layer against an in-process Postgres (PGlite).
 *
 * What it proves (no cloud credentials needed):
 *   1. All three migrations and the generated seed apply cleanly.
 *   2. RLS isolates users; reward tables are read-only for clients; content
 *      tables are read-only; anon sees nothing.
 *   3. The assignment guard trigger blocks client-side completion AND
 *      reopening completed quests.
 *   4. SECURITY DEFINER helpers are not executable by clients.
 *   5. RPCs refuse anon execution, refuse unauthenticated calls, refuse
 *      cross-user operations, and pay XP exactly once (idempotency).
 *   6. SQL progression formulas (level curve, attribute curve) match the
 *      TypeScript engine exactly over a value sweep.
 *   7. The SQL rank ladder agrees with src/core (rankForStats) on synthetic
 *      users constructed at every tier boundary — including a B-tier user
 *      that is blocked by an unbalanced path.
 *
 * Run: npm run db:verify
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { levelFromXp, xpThresholdForLevel } from '../src/core/level';
import { scoreFromAttributeXp } from '../src/core/attributes';
import { rankForStats } from '../src/core/rank';
import type { ProgressionStats } from '../src/core/types';

// ------------------------------------------------------------------ harness
let passed = 0;
let failed = 0;

function ok(cond: boolean, name: string, extra?: unknown): void {
  if (cond) {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${name}`);
    if (extra !== undefined) console.error('      ', JSON.stringify(extra));
  }
}

type Param = string | number;
type SqlParams = Param[] | undefined;

async function expectError(
  db: PGlite,
  sql: string,
  contains: string,
  name: string,
  params?: SqlParams,
): Promise<void> {
  try {
    await db.query(sql, params);
    ok(false, `${name} (no error raised)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ok(message.includes(contains), name, { got: message.slice(0, 160) });
  }
}

/** Run `fn` under a role, optionally impersonating a uid via the auth.uid() shim. */
async function asRole<T>(
  db: PGlite,
  role: 'anon' | 'authenticated',
  uid: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.query('reset role');
  await db.query(`set role ${role}`);
  await db.query('select set_config($1, $2, false)', ['arise.test_uid', uid ?? '']);
  try {
    return await fn();
  } finally {
    await db.query('reset role');
  }
}

// Scenario users are created by this harness; ids must be distinct.
const uidA = '11111111-1111-4111-8111-111111111111';
const uidB = '22222222-2222-4222-8222-222222222222';

interface StatsRow {
  total_xp: string | number;
  level: number;
  completed_quests: string | number;
  active_days: string | number;
  current_streak: number;
  longest_streak: number;
  quests_vitality: string | number;
  quests_intelligence: string | number;
  quests_discipline: string | number;
  lessons_completed: string | number;
  workouts_logged: string | number;
  reflections_logged: string | number;
  focus_minutes: string | number;
  achievements_earned: string | number;
  rank: string;
}

/** Map an arise_stats() row onto the exact shape rankForStats() consumes. */
function toTsStats(r: StatsRow): Omit<ProgressionStats, 'rank'> {
  return {
    totalXp: Number(r.total_xp),
    level: Number(r.level),
    completedQuests: Number(r.completed_quests),
    distinctActiveDays: Number(r.active_days),
    currentStreak: Number(r.current_streak),
    longestStreak: Number(r.longest_streak),
    questsByPath: {
      vitality: Number(r.quests_vitality),
      intelligence: Number(r.quests_intelligence),
      discipline: Number(r.quests_discipline),
    },
    lessonsCompleted: Number(r.lessons_completed),
    workoutsLogged: Number(r.workouts_logged),
    reflectionsLogged: Number(r.reflections_logged),
    focusMinutes: Number(r.focus_minutes),
    achievementsEarned: Number(r.achievements_earned),
  };
}

async function statsOf(db: PGlite, uid: string): Promise<StatsRow> {
  const res = await db.query<StatsRow>(
    'select * from public.arise_stats($1::uuid)',
    [uid],
  );
  return res.rows[0];
}

/**
 * Builds a synthetic user directly in SQL (superuser, bypassing RLS/RPCs on
 * purpose — these are scenario fixtures, not client paths) whose aggregates
 * satisfy exactly the given tier requirements, then asserts that SQL and the
 * TypeScript engine agree on the resulting rank.
 */
async function assertRankScenario(
  db: PGlite,
  opts: {
    label: string;
    uid: string;
    level: number;
    quests: number;
    /** Days covered by completed quests: floor(i / templates) over i < quests. */
    workoutDatesFrom: number;
    /** Inclusive-exclusive range [from, to) of extra active days before today. */
    workoutDatesTo: number;
    /** Extra workout rows on already-active days, to satisfy the workouts metric. */
    extraWorkoutRows: number;
    achievements: number;
    lessons: number;
    dailyTemplates: string[]; // exactly 3 ids, one per path
    expectedRank: string;
  },
): Promise<void> {
  const uid = opts.uid;
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1::uuid, $2, '{}')`,
    [uid, `${opts.label.replace(/[^a-z0-9]/gi, '')}@scenario.test`],
  );

  // Level via the documented curve: threshold(L) = 100 × (L − 1)².
  const xp = xpThresholdForLevel(opts.level);
  await db.query(
    `insert into public.xp_transactions
       (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
     values ($1::uuid, $2::int, 'quest', 'scenario', 'Scenario baseline', 'scenario:xp', '{}'::jsonb)`,
    [uid, xp],
  );

  // Completed quests: template cycles over the 3 per-path dailies, dates
  // advance every 3 quests — unique (owner, template, date) is respected.
  const todayRes = await db.query<{ today: string }>(
    'select public.arise_today($1::uuid)::text as today',
    [uid],
  );
  const today = todayRes.rows[0].today;
  for (let i = 0; i < opts.quests; i += 1) {
    const template = opts.dailyTemplates[i % 3];
    const dayOffset = Math.floor(i / 3);
    await db.query(
      `insert into public.quest_assignments
         (owner_id, template_id, assigned_date, cadence, status, completed_at, xp_awarded)
       values ($1::uuid, $2::text, ($3::date - $4::int)::date, 'daily', 'completed', now(), 10)
       on conflict (owner_id, template_id, assigned_date) do nothing`,
      [uid, template, today, dayOffset],
    );
  }

  // Extra active days via workouts (extends the contiguous streak).
  for (let d = opts.workoutDatesFrom; d < opts.workoutDatesTo; d += 1) {
    await db.query(
      `insert into public.workout_sessions
         (owner_id, session_date, title, duration_minutes)
       values ($1::uuid, ($2::date - $3::int)::date, 'Scenario training', 30)`,
      [uid, today, d],
    );
  }
  // Metric-only workout rows on days that are already active.
  for (let k = 0; k < opts.extraWorkoutRows; k += 1) {
    await db.query(
      `insert into public.workout_sessions
         (owner_id, session_date, title, duration_minutes)
       values ($1::uuid, ($2::date)::date, 'Extra volume', 15)`,
      [uid, today],
    );
  }

  if (opts.achievements > 0) {
    await db.query(
      `insert into public.user_achievements (owner_id, achievement_id)
       select $1::uuid, id from public.achievements order by id limit $2::int`,
      [uid, opts.achievements],
    );
  }
  for (let l = 1; l <= opts.lessons; l += 1) {
    await db.query(
      `insert into public.learning_progress (owner_id, lesson_id, state, completed_at)
       values ($1::uuid, 'scenario-lesson-' || $2::int, 'completed', now())`,
      [uid, l],
    );
  }

  const row = await statsOf(db, uid);
  const tsStats = toTsStats(row);
  const tsRank = rankForStats(tsStats);
  const tsLevel = levelFromXp(tsStats.totalXp);

  ok(row.rank === opts.expectedRank, `${opts.label}: SQL rank is ${opts.expectedRank} (got ${row.rank})`, row);
  ok(tsRank === opts.expectedRank, `${opts.label}: TS rankForStats agrees (${tsRank})`, tsStats);
  ok(Number(row.level) === opts.level && tsLevel === opts.level,
    `${opts.label}: level ${opts.level} in both engines (SQL ${row.level}, TS ${tsLevel})`);
}

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..');
  const db = new PGlite();
  await db.exec(`set timezone = 'UTC'`);

  // ---------------------------------------------------- Supabase environment
  // Mirrors what a hosted Supabase project provides out of the box:
  // the auth schema, the standard API roles, and default privileges.
  console.log('\n[1/9] Shim: auth schema, roles, default privileges');
  await db.exec(`
    create schema if not exists auth;

    create table if not exists auth.users (
      id                 uuid primary key,
      email              text unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at         timestamptz not null default now()
    );

    create or replace function auth.uid()
    returns uuid
    language sql stable
    as $$ select nullif(current_setting('arise.test_uid', true), '')::uuid $$;

    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon')
        then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated')
        then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role')
        then create role service_role nologin; end if;
    end $$;

    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth  to anon, authenticated, service_role;

    alter default privileges in schema public
      grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public
      grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public
      grant execute on functions to anon, authenticated, service_role;
  `);
  ok(true, 'shim applied');

  // ------------------------------------------------------------- migrations
  console.log('\n[2/9] Apply migrations + seed');
  for (const file of ['0001_schema.sql', '0002_progression.sql', '0003_operations.sql']) {
    const sql = readFileSync(join(root, 'supabase', 'migrations', file), 'utf8');
    await db.exec(sql);
    ok(true, `applied ${file}`);
  }
  await db.exec(readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8'));
  ok(true, 'applied seed.sql');

  const counts = await db.query<{ quests: string; achievements: string; skills: string; lessons: string }>(
    `select (select count(*) from quest_templates) as quests,
            (select count(*) from achievements)     as achievements,
            (select count(*) from skill_defs)       as skills,
            (select count(*) from lesson_defs)      as lessons`,
  );
  const c = counts.rows[0];
  ok(
    Number(c.quests) > 30 && Number(c.achievements) >= 10
      && Number(c.skills) >= 20 && Number(c.lessons) >= 20,
    `seed content loaded (${c.quests} quests, ${c.achievements} achievements, ${c.skills} skills, ${c.lessons} lessons)`,
  );

  // ------------------------------------------------------------------ users
  console.log('\n[3/9] Users, profiles trigger, RLS matrix');
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1::uuid, 'alice@hunt.dev', '{"display_name":"Alice"}'),
       ($2::uuid, 'bob@hunt.dev',   '{"display_name":"Bob"}')`,
    [uidA, uidB],
  );
  const profiles = await db.query<{ n: string }>(
    'select count(*)::text as n from public.profiles',
  );
  ok(profiles.rows[0].n === '2', 'handle_new_user trigger created both profiles');

  // Active paths are part of onboarding (users update their own row via RLS).
  await db.query(
    `update public.profiles
     set preferences = '{"activePaths":["vitality","intelligence","discipline"]}'::jsonb
     where id = $1::uuid`,
    [uidA],
  );

  const seenA = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ n: string }>('select count(*)::text as n from public.profiles');
    return r.rows[0].n;
  });
  ok(seenA === '1', 'RLS: Alice sees only her own profile');
  const seenAnon = await asRole(db, 'anon', null, async () => {
    const r = await db.query<{ n: string }>('select count(*)::text as n from public.profiles');
    return r.rows[0].n;
  });
  ok(seenAnon === '0', 'RLS: anon sees no profiles');
  const contentAnon = await asRole(db, 'anon', null, async () => {
    const r = await db.query<{ n: string }>('select count(*)::text as n from public.quest_templates');
    return r.rows[0].n;
  });
  ok(contentAnon === '0', 'RLS: anon cannot read content tables');
  const contentAuthed = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ n: string }>('select count(*)::text as n from public.quest_templates');
    return r.rows[0].n;
  });
  ok(Number(contentAuthed) > 30, 'RLS: authenticated can read quest templates');

  await asRole(db, 'authenticated', uidA, async () => {
    await expectError(
      db,
      `insert into public.xp_transactions
         (owner_id, amount, source_type, source_ref, source_label, idempotency_key)
       values (auth.uid(), 99999, 'quest', 'hack', 'Hack', 'hack:1')`,
      'row-level security',
      'RLS: client cannot insert XP directly',
    );
    await expectError(
      db,
      `insert into public.journal_entries (owner_id, entry_date, content)
       values (auth.uid(), current_date, 'sneaky direct journal write')`,
      'row-level security',
      'RLS: client cannot write journal rows directly',
    );
    await expectError(
      db,
      `insert into public.quest_templates (id, title, description, path, difficulty, duration_minutes)
       values ('evil', 'Evil', 'x', 'vitality', 'easy', 5)`,
      'row-level security',
      'RLS: clients cannot modify content tables',
    );
  });

  // SECURITY DEFINER helpers are internal-only.
  await asRole(db, 'authenticated', uidA, async () => {
    await expectError(
      db, 'select public.arise_stats($1::uuid)', 'permission denied for function arise_stats',
      'grant hygiene: arise_stats is not client-callable', [uidA],
    );
    await expectError(
      db, 'select public.arise_refresh_attributes($1::uuid)', 'permission denied',
      'grant hygiene: arise_refresh_attributes is not client-callable', [uidA],
    );
    await expectError(
      db, 'select public.arise_milestone_events($1::uuid, 1, \'E\')', 'permission denied',
      'grant hygiene: arise_milestone_events is not client-callable', [uidA],
    );
  });

  // ------------------------------------------------------------- sync day
  console.log('\n[4/9] Daily sync idempotency');
  const dummyId = '00000000-0000-4000-8000-00000000dead';
  await asRole(db, 'authenticated', null, async () => {
    await expectError(
      db, 'select public.arise_sync_day($1::jsonb)', 'not_authenticated',
      'RPC refuses sync with no authenticated uid', [JSON.stringify([])],
    );
    await expectError(
      db, 'select public.arise_complete_quest($1::uuid)', 'not_authenticated',
      'RPC refuses completion with empty uid', [dummyId],
    );
  });
  await asRole(db, 'anon', null, async () => {
    await expectError(
      db, 'select public.arise_complete_quest($1::uuid)', 'permission denied',
      'anon cannot execute arise_complete_quest',
      [dummyId],
    );
  });

  const dailyRows = await db.query<{ id: string; path: string }>(
    `select id, path from (
       select id, path, row_number() over (partition by path order by id) as rn
       from public.quest_templates
       where cadence = 'daily' and min_level <= 1
         and (requires_skills is null or cardinality(requires_skills) = 0)
     ) t where rn = 1 order by path`,
  );
  ok(dailyRows.rows.length === 3, `found one eligible daily template per path (${dailyRows.rows.length})`);
  const dailyTemplates = dailyRows.rows.map((r) => r.id);

  const weeklyRow = await db.query<{ id: string }>(
    `select id from public.quest_templates
     where cadence = 'weekly' and min_level <= 1
       and (requires_skills is null or cardinality(requires_skills) = 0)
     order by id limit 1`,
  );

  const dates = await db.query<{ today: string; week: string }>(
    `select public.arise_today($1::uuid)::text as today,
            (public.arise_today($1::uuid) - ((extract(dow from public.arise_today($1::uuid))::int + 6) % 7))::text as week`,
    [uidA],
  );
  const { today, week } = dates.rows[0];

  const plan = [
    ...dailyTemplates.map((id) => ({ template_id: id, assigned_date: today, cadence: 'daily' })),
    ...weeklyRow.rows.map((r) => ({ template_id: r.id, assigned_date: week, cadence: 'weekly' })),
  ];

  const sync1 = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ created: { created: number } }>(
      'select public.arise_sync_day($1::jsonb) as created',
      [JSON.stringify(plan)],
    );
    return r.rows[0].created;
  });
  const sync2 = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ created: { created: number } }>(
      'select public.arise_sync_day($1::jsonb) as created',
      [JSON.stringify(plan)],
    );
    return r.rows[0].created;
  });
  const assigned = await db.query<{ n: string }>(
    'select count(*)::text as n from public.quest_assignments where owner_id = $1::uuid',
    [uidA],
  );
  ok(sync1.created === plan.length, `sync created ${plan.length} assignments (got ${sync1.created})`);
  ok(sync2.created === 0, 're-sync is idempotent (created 0)');
  ok(assigned.rows[0].n === String(plan.length), 'assignment rows not duplicated on re-sync');

  // ------------------------------------------------------- guard trigger
  // Runs after sync so a real assignment exists to attack.
  const firstDaily = await db.query<{ id: string }>(
    `select id from public.quest_assignments where owner_id = $1::uuid order by id limit 1`,
    [uidA],
  );

  await asRole(db, 'authenticated', uidA, async () => {
    await expectError(
      db,
      `update public.quest_assignments set status = 'completed' where id = $1::uuid`,
      'Quest completion must go through arise_complete_quest()',
      'guard: client cannot mark a quest completed directly',
      [firstDaily.rows[0].id],
    );
  });

  // --------------------------------------------------- quest completion
  console.log('\n[5/9] Quest completion pays XP exactly once');

  // Pick an eligible daily assignment and complete it through the RPC.
  const target = await db.query<{ id: string; xp: string }>(
    `select qa.id,
            coalesce(qt.xp_reward,
              case qt.difficulty when 'easy' then 10 when 'medium' then 25 else 50 end)::text as xp
     from public.quest_assignments qa
     join public.quest_templates qt on qt.id = qa.template_id
     where qa.owner_id = $1::uuid and qa.cadence = 'daily' and qa.status = 'available'
     order by qa.id limit 1`,
    [uidA],
  );
  const assignmentId = target.rows[0].id;
  const expectedXp = Number(target.rows[0].xp);

  interface QuestResult {
    xp_gained: number;
    duplicate: boolean;
    level_before: number;
    level_after: number;
    rank_before: string;
    rank_after: string;
    new_achievements: string[];
  }

  const done1 = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ result: QuestResult }>(
      'select public.arise_complete_quest($1::uuid, $2::text, $3::text) as result',
      [assignmentId, 'ran 5k', 'felt strong'],
    );
    return r.rows[0].result;
  });
  const done2 = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ result: QuestResult }>(
      'select public.arise_complete_quest($1::uuid, $2::text, $3::text) as result',
      [assignmentId, 'ran 5k', 'felt strong'],
    );
    return r.rows[0].result;
  });
  ok(done1.duplicate === false && done1.xp_gained === expectedXp,
    `quest completion pays configured XP once (+${expectedXp})`, done1);
  ok(done2.duplicate === true && done2.xp_gained === 0,
    'immediate retry is a no-op (duplicate, +0 XP)', done2);
  const questLedger = await db.query<{ n: string }>(
    `select count(*)::text as n from public.xp_transactions
     where owner_id = $1::uuid and idempotency_key = 'quest:' || $2::text`,
    [uidA, assignmentId],
  );
  ok(questLedger.rows[0].n === '1', 'exactly one XP ledger row for the quest');

  // Cross-user protection: Bob cannot complete Alice's assignment.
  await asRole(db, 'authenticated', uidB, async () => {
    await expectError(
      db, 'select public.arise_complete_quest($1::uuid)', 'quest_not_found',
      'RPC refuses cross-user quest completion', [assignmentId],
    );
  });
  await asRole(db, 'anon', null, async () => {
    await expectError(
      db, 'select public.arise_complete_lesson($1::text)', 'permission denied',
      'anon cannot execute arise_complete_lesson', ['any-lesson'],
    );
    await expectError(
      db, 'select public.arise_delete_account()', 'permission denied',
      'anon cannot execute arise_delete_account',
    );
  });

  // Reopening a completed quest is blocked for clients.
  await asRole(db, 'authenticated', uidA, async () => {
    await expectError(
      db,
      `update public.quest_assignments set status = 'available' where id = $1::uuid`,
      'Completed quests cannot be reopened',
      'guard: clients cannot reopen completed quests',
      [assignmentId],
    );
  });

  // ------------------------------------------------------------- lessons
  console.log('\n[6/9] Lessons, reflections, workouts, focus');
  const lesson = await db.query<{ id: string; xp: string }>(
    `select id, xp_reward::text as xp from public.lesson_defs order by id limit 1`,
  );
  const lessonId = lesson.rows[0].id;
  const lessonXp = Number(lesson.rows[0].xp);
  const lessonFirst = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ result: { xp_gained: number; duplicate: boolean } }>(
      'select public.arise_complete_lesson($1::text, 90::int) as result',
      [lessonId],
    );
    return r.rows[0].result;
  });
  const lessonRetake = await asRole(db, 'authenticated', uidA, async () => {
    const r = await db.query<{ result: { xp_gained: number; duplicate: boolean } }>(
      'select public.arise_complete_lesson($1::text, 90::int) as result',
      [lessonId],
    );
    return r.rows[0].result;
  });
  ok(lessonFirst.duplicate === false && lessonFirst.xp_gained === lessonXp,
    `lesson completion pays configured XP (+${lessonXp})`, lessonFirst);
  ok(lessonRetake.duplicate === true && lessonRetake.xp_gained === 0,
    'lesson re-take pays nothing (duplicate)', lessonRetake);
  const lessonLedger = await db.query<{ n: string }>(
    `select count(*)::text as n from public.xp_transactions
     where owner_id = $1::uuid and idempotency_key = 'lesson:' || $2::text`,
    [uidA, lessonId],
  );
  ok(lessonLedger.rows[0].n === '1', `lesson paid exactly once (+${lessonXp}), one ledger row`);

  // Reflections (Bob's flow): validation, once-per-day XP, entries preserved.
  await asRole(db, 'authenticated', uidB, async () => {
    await expectError(
      db, 'select public.arise_log_reflection($1::date, $2::text)', 'reflection_too_short',
      'reflection validation rejects stub content', [today, 'too short'],
    );
  });
  const refl1 = await asRole(db, 'authenticated', uidB, async () => {
    const r = await db.query<{ result: { xp_gained: number } }>(
      'select public.arise_log_reflection($1::date, $2::text) as result',
      [today, 'Day one logs: shipped the harness and held focus for two blocks.'],
    );
    return r.rows[0].result;
  });
  const refl2 = await asRole(db, 'authenticated', uidB, async () => {
    const r = await db.query<{ result: { xp_gained: number } }>(
      'select public.arise_log_reflection($1::date, $2::text) as result',
      [today, 'Second entry the same evening: noted a distraction pattern around 3pm.'],
    );
    return r.rows[0].result;
  });
  ok(refl1.xp_gained === 10, 'first reflection pays +10 XP', refl1);
  ok(refl2.xp_gained === 0, 'second same-day reflection pays 0 XP', refl2);
  const reflRows = await db.query<{ journal: string; ledger: string }>(
    `select (select count(*)::text from public.journal_entries where owner_id = $1::uuid) as journal,
            (select count(*)::text from public.xp_transactions
             where owner_id = $1::uuid and idempotency_key = 'journal:' || $2::text) as ledger`,
    [uidB, today],
  );
  ok(reflRows.rows[0].journal === '2' && reflRows.rows[0].ledger === '1',
    'both reflections saved, only one XP ledger row');

  // Workout + focus XP mirror the TS constants.
  const workoutDone = await asRole(db, 'authenticated', uidB, async () => {
    const r = await db.query<{ result: { xp_gained: number } }>(
      'select public.arise_log_workout($1::date, $2::text) as result',
      [today, 'Push day'],
    );
    return r.rows[0].result;
  });
  ok(workoutDone.xp_gained === 30, 'moderate workout pays +30 XP', workoutDone);
  await asRole(db, 'authenticated', uidB, async () => {
    await expectError(
      db, 'select public.arise_log_workout($1::date, $2::text, \'vitality\', \'{}\'::text[], $3::int)', 'invalid_duration',
      'workout duration bounds enforced', [today, 'Bad', 0],
    );
    await expectError(
      db, 'select public.arise_log_focus($1::date, $2::int)', 'invalid_duration',
      'focus duration bounds enforced', [today, 0],
    );
  });
  const focusDone = await asRole(db, 'authenticated', uidB, async () => {
    const r = await db.query<{ result: { xp_gained: number } }>(
      'select public.arise_log_focus($1::date, 25::int, $2::text) as result',
      [today, 'Deep work'],
    );
    return r.rows[0].result;
  });
  // TS mirror: min(40, max(5, round(minutes × 1.5))) = round(37.5) = 38.
  ok(focusDone.xp_gained === 38, '25-minute focus session pays +38 XP', focusDone);

  // ------------------------------------------------- formula parity sweeps
  console.log('\n[7/9] TS ↔ SQL formula parity (level + attribute curves)');
  const levelXps = [0, 1, 99, 100, 101, 399, 400, 899, 900, 2500, 8100, 19600,
    44100, 84100, 84199, xpThresholdForLevel(99), xpThresholdForLevel(99) + 500, 10_000_000];
  const levelRows = await db.query<{ xp: number; sql_level: number }>(
    `select v::int as xp, public.arise_level_from_xp(v::bigint) as sql_level
     from unnest($1::int[]) v`,
    [`{${levelXps.join(',')}}`],
  );
  const levelMismatches = levelRows.rows.filter((r) => levelFromXp(Number(r.xp)) !== Number(r.sql_level));
  ok(levelMismatches.length === 0,
    `level curve identical over ${levelXps.length} probe values (incl. cap at 100)`,
    levelMismatches);

  const attrXps = [0, 1, 5, 10, 25, 50, 100, 200, 300, 600, 900, 1200, 1800, 3000, 6000, 12000];
  const attrRows = await db.query<{ xp: number; sql_value: number }>(
    `select v::int as xp, public.arise_attribute_value(v::numeric) as sql_value
     from unnest($1::int[]) v`,
    [`{${attrXps.join(',')}}`],
  );
  const attrMismatches = attrRows.rows.filter((r) => scoreFromAttributeXp(Number(r.xp)) !== Number(r.sql_value));
  ok(attrMismatches.length === 0,
    `attribute curve identical over ${attrXps.length} probe values`,
    attrMismatches);

  // ------------------------------------------------- rank ladder scenarios
  console.log('\n[8/9] Rank ladder: SQL arise_stats vs TS rankForStats');
  const tplRes = await db.query<{ path: string; id: string }>(
    `select path, id from (
       select path, id, row_number() over (partition by path order by id) as rn
       from public.quest_templates where cadence = 'daily'
     ) t where rn = 1 order by path`,
  );
  const threeTemplates = tplRes.rows.map((r) => r.id);
  ok(threeTemplates.length === 3, 'rank scenarios: 3 per-path daily templates available');

  // D: level 3, 5 quests over 2 dates, 1 workout day → 3 active days, streak 3.
  await assertRankScenario(db, {
    label: 'rank-D', uid: 'd0000000-0000-4000-8000-000000000001', level: 3, quests: 5,
    workoutDatesFrom: 2, workoutDatesTo: 3, extraWorkoutRows: 0,
    achievements: 0, lessons: 0, dailyTemplates: threeTemplates, expectedRank: 'D',
  });
  // C: level 6, 15 quests over 5 dates, workouts → 7 active days. 2 achievements.
  await assertRankScenario(db, {
    label: 'rank-C', uid: 'c0000000-0000-4000-8000-000000000002', level: 6, quests: 15,
    workoutDatesFrom: 5, workoutDatesTo: 7, extraWorkoutRows: 0,
    achievements: 2, lessons: 0, dailyTemplates: threeTemplates, expectedRank: 'C',
  });
  // B: level 10, 30 quests (10 per path) over 10 dates, workouts → 14 active days.
  await assertRankScenario(db, {
    label: 'rank-B', uid: 'b0000000-0000-4000-8000-000000000003', level: 10, quests: 30,
    workoutDatesFrom: 10, workoutDatesTo: 14, extraWorkoutRows: 0,
    achievements: 4, lessons: 0, dailyTemplates: threeTemplates, expectedRank: 'B',
  });
  // B-blocked: same totals, but only 2 paths exercised (15/15/0) → must cap at C.
  // This is the regression the tier-B SQL drift would have failed.
  await assertRankScenario(db, {
    label: 'rank-B-blocked', uid: 'bb000000-0000-4000-8000-000000000004', level: 10, quests: 30,
    workoutDatesFrom: 15, workoutDatesTo: 17, extraWorkoutRows: 0,
    achievements: 4, lessons: 0,
    dailyTemplates: [threeTemplates[0], threeTemplates[1], threeTemplates[0]],
    expectedRank: 'C',
  });
  // A: level 15, 60 quests over 20 dates, workouts → 30 days; 6 achievements,
  // 10 lessons, 12 workout rows.
  await assertRankScenario(db, {
    label: 'rank-A', uid: 'a0000000-0000-4000-8000-000000000005', level: 15, quests: 60,
    workoutDatesFrom: 20, workoutDatesTo: 30, extraWorkoutRows: 2,
    achievements: 6, lessons: 10, dailyTemplates: threeTemplates, expectedRank: 'A',
  });
  // S: level 22, 100 quests over 34 dates, workouts → 60 days;
  // 9 achievements, 20 lessons, 26 workout rows.
  await assertRankScenario(db, {
    label: 'rank-S', uid: '5e000000-0000-4000-8000-000000000006', level: 22, quests: 100,
    workoutDatesFrom: 34, workoutDatesTo: 60, extraWorkoutRows: 0,
    achievements: 9, lessons: 20, dailyTemplates: threeTemplates, expectedRank: 'S',
  });
  // SS: level 30, 160 quests over 54 dates, workouts → 120 days, streak 120.
  await assertRankScenario(db, {
    label: 'rank-SS', uid: '5e500000-0000-4000-8000-000000000007', level: 30, quests: 160,
    workoutDatesFrom: 54, workoutDatesTo: 120, extraWorkoutRows: 0,
    achievements: 12, lessons: 0, dailyTemplates: threeTemplates, expectedRank: 'SS',
  });

  // Live parity on the real user: SQL stats must satisfy the TS engine too.
  const liveA = await statsOf(db, uidA);
  ok(rankForStats(toTsStats(liveA)) === liveA.rank,
    `live user parity: SQL rank ${liveA.rank} matches TS engine`,
    { sql: liveA.rank, ts: rankForStats(toTsStats(liveA)) });
  ok(levelFromXp(Number(liveA.total_xp)) === Number(liveA.level),
    'live user parity: SQL level matches levelFromXp(total XP)');

  // -------------------------------------------------------- account deletion
  console.log('\n[9/9] Account deletion cascades');
  await asRole(db, 'authenticated', uidB, async () => {
    const r = await db.query<{ result: { deleted: boolean } }>(
      'select public.arise_delete_account() as result',
    );
    ok(r.rows[0].result.deleted === true, 'delete-account RPC succeeds for the owner');
  });
  const afterDelete = await db.query<{ profiles: string; xp: string; journal: string }>(
    `select (select count(*)::text from public.profiles where id = $1::uuid) as profiles,
            (select count(*)::text from public.xp_transactions where owner_id = $1::uuid) as xp,
            (select count(*)::text from public.journal_entries where owner_id = $1::uuid) as journal`,
    [uidB],
  );
  ok(afterDelete.rows[0].profiles === '0' && afterDelete.rows[0].xp === '0'
    && afterDelete.rows[0].journal === '0',
    'deletion cascaded through profiles, XP ledger and journal');

  // ------------------------------------------------------------------ done
  console.log(`\n${passed} passed, ${failed} failed`);
  await db.close();
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nHarness crashed:', err);
  process.exit(1);
});
