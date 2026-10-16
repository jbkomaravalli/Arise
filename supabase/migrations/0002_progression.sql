-- ===========================================================================
-- ARISE — 0002_progression.sql
-- Authoritative progression engine in PostgreSQL.
--
-- Mirrors the TypeScript engine in src/core/ exactly:
--   * Level:      XP to reach level L = 100 × (L − 1)², capped at 100
--   * Attributes: score = round(100 × (1 − e^(−attrXp / 600)))
--   * Ranks:      ladder in src/core/config.ts (RANK_LADDER)
--   * Achievements/skills: evaluated from real records only
--
-- Every function is SECURITY DEFINER, checks auth.uid() itself, and writes
-- rewards through idempotency keys so retries can never double-pay.
-- ===========================================================================

begin;

-- --------------------------------------------------------------- helpers
create or replace function public.arise_level_from_xp(p_xp bigint)
returns integer
language sql
immutable
as $$
  select least(100, floor(sqrt(greatest(p_xp, 0) / 100.0))::int + 1);
$$;

create or replace function public.arise_attribute_value(p_xp numeric)
returns integer
language sql
immutable
as $$
  select least(100, round((100 * (1 - exp(-greatest(p_xp, 0) / 600.0)))::numeric)::int);
$$;

create or replace function public.arise_today(p_owner uuid)
returns date
language sql
stable
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_owner), 'UTC'))::date;
$$;

-- ------------------------------------------------------------------ stats
create or replace function public.arise_stats(p_owner uuid)
returns table (
  total_xp            bigint,
  level               integer,
  completed_quests    bigint,
  active_days         bigint,
  current_streak      integer,
  longest_streak      integer,
  quests_vitality     bigint,
  quests_intelligence bigint,
  quests_discipline   bigint,
  lessons_completed   bigint,
  workouts_logged     bigint,
  reflections_logged  bigint,
  focus_minutes       bigint,
  achievements_earned bigint,
  rank                text
)
language sql
stable
as $$
with tx as (
  select coalesce(sum(amount), 0)::bigint as total
  from public.xp_transactions
  where owner_id = p_owner
),
done as (
  select qa.assigned_date as d, qt.path as path
  from public.quest_assignments qa
  join public.quest_templates qt on qt.id = qa.template_id
  where qa.owner_id = p_owner and qa.status = 'completed'
),
active as (
  select d from done
  union select session_date from public.workout_sessions where owner_id = p_owner
  union select entry_date from public.journal_entries where owner_id = p_owner
  union select session_date from public.focus_sessions where owner_id = p_owner and completed
),
rest_days as (
  select coalesce(
    array(
      select e.value::int
      from jsonb_array_elements_text(
        coalesce((select preferences -> 'restDays' from public.profiles where id = p_owner), '[]'::jsonb)
      ) e
    ),
    '{}'
  )::int[] as days
),
bounds as (
  select min(d) as first_day from active
),
series as (
  select g.d::date as d
  from bounds b,
       lateral generate_series(b.first_day, (select current_date), interval '1 day') as g(d)
  where b.first_day is not null
),
flags as (
  select s.d,
         exists(select 1 from active ac where ac.d = s.d) as is_active,
         (extract(dow from s.d)::int in (select unnest(rd.days) from rest_days rd)) as is_rest
  from series s
),
runs as (
  select
    sum(case when (not is_active) and (not is_rest) and d < (select current_date) then 1 else 0 end)
      over (order by d) as run_id,
    is_active
  from flags
),
run_totals as (
  select run_id, count(*) filter (where is_active) as n
  from runs
  group by run_id
),
agg as (
  select
    (select total from tx) as total_xp,
    (select count(*) from active) as active_days,
    coalesce((select n from run_totals order by run_id desc limit 1), 0) as current_streak,
    coalesce((select max(n) from run_totals), 0) as longest_streak,
    (select count(*) from done where path = 'vitality') as quests_vitality,
    (select count(*) from done where path = 'intelligence') as quests_intelligence,
    (select count(*) from done where path = 'discipline') as quests_discipline,
    (select count(*) from public.learning_progress where owner_id = p_owner and state = 'completed') as lessons_completed,
    (select count(*) from public.workout_sessions where owner_id = p_owner) as workouts_logged,
    (select count(*) from public.journal_entries where owner_id = p_owner) as reflections_logged,
    (select coalesce(sum(minutes), 0) from public.focus_sessions where owner_id = p_owner and completed) as focus_minutes,
    (select count(*) from public.user_achievements where owner_id = p_owner) as achievements_earned
)
select
  agg.total_xp,
  public.arise_level_from_xp(agg.total_xp) as level,
  (select count(*) from done) as completed_quests,
  agg.active_days,
  agg.current_streak,
  agg.longest_streak,
  agg.quests_vitality,
  agg.quests_intelligence,
  agg.quests_discipline,
  agg.lessons_completed,
  agg.workouts_logged,
  agg.reflections_logged,
  agg.focus_minutes,
  agg.achievements_earned,
  coalesce((
    select l.tier
    from (values
      ('E',  0,   0,   0,   0,  0,  0,  0, 0),
      ('D',  3,   5,   3,   0,  0,  0,  0, 0),
      ('C',  6,  15,   7,   2,  0,  0,  0, 0),
      ('B', 10,  30,  14,   4,  0,  0,  0, 8),
      ('A', 15,  60,  30,   6, 10, 12,  0, 0),
      ('S', 22, 100,  60,   9, 20, 25,  0, 0),
      ('SS',30, 160, 120,  12,  0,  0, 14, 0)
    ) as l(tier, min_level, min_quests, min_days, min_achievements, min_lessons, min_workouts, min_streak, min_path)
    where public.arise_level_from_xp(agg.total_xp) >= l.min_level
      and (select count(*) from done) >= l.min_quests
      and agg.active_days >= l.min_days
      and agg.achievements_earned >= l.min_achievements
      and agg.lessons_completed >= l.min_lessons
      and agg.workouts_logged >= l.min_workouts
      and greatest(agg.current_streak, agg.longest_streak) >= l.min_streak
      and least(agg.quests_vitality, agg.quests_intelligence, agg.quests_discipline) >= l.min_path
    order by array_position(array['E','D','C','B','A','S','SS'], l.tier) desc
    limit 1
  ), 'E') as rank
from agg;
$$;

-- ----------------------------------------------------- attribute snapshots
create or replace function public.arise_refresh_attributes(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attr record;
  v_xp numeric;
  v_value integer;
  v_milestones constant integer[] := array[10, 25, 40, 55, 70, 85, 100];
begin
  for v_attr in
    select unnest(array['strength','endurance','mobility','technical','problemSolving','discipline']) as attribute
  loop
    select coalesce(sum((w.value)::numeric), 0)
    into v_xp
    from xp_transactions t
    cross join jsonb_each(t.attribute_weights) w
    where t.owner_id = p_owner and w.key = v_attr.attribute;

    v_value := public.arise_attribute_value(v_xp);

    insert into user_attributes (owner_id, attribute, value, xp, milestone_index, updated_at)
    values (
      p_owner,
      v_attr.attribute,
      v_value,
      v_xp,
      (select count(*) from unnest(v_milestones) m where m <= v_value),
      now()
    )
    on conflict (owner_id, attribute) do update
      set value = excluded.value,
          xp = excluded.xp,
          milestone_index = excluded.milestone_index,
          updated_at = now();
  end loop;
end;
$$;

-- -------------------------------------------------- achievements + skills
-- Evaluates achievement rules and skill measures from real records, inserting
-- only what is missing (idempotent by unique constraints). Returns the ids of
-- achievements earned during this call.
create or replace function public.arise_evaluate_progress(p_owner uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats record;
  v_new_achievements text[];
  v_skill_count integer;
  v_skill record;
  v_current integer;
begin
  select * into v_stats from public.arise_stats(p_owner);

  -- Achievements -----------------------------------------------------------
  with qualifying as (
    select 'first_awakening'::text as id where v_stats.completed_quests >= 1
    union all select 'consistency_begins' where v_stats.active_days >= 3
    union all select 'body_in_motion' where v_stats.workouts_logged >= 5
    union all select 'terminal_initiate' where (
      select count(*) from learning_progress
      where owner_id = p_owner and state = 'completed'
        and (lesson_id like 'linux%' or lesson_id like 'fs%' or lesson_id like 'proc%')
    ) >= 5
    union all select 'network_explorer' where exists (
      select 1 from learning_progress
      where owner_id = p_owner and state = 'completed'
        and lesson_id like 'net%' and coalesce(quiz_score, 0) >= 80
    )
    union all select 'discipline_protocol' where v_stats.reflections_logged >= 5
    union all select 'balanced_hunter'
      where least(v_stats.quests_vitality, v_stats.quests_intelligence, v_stats.quests_discipline) >= 5
    union all select 'streak_spark' where greatest(v_stats.current_streak, v_stats.longest_streak) >= 7
    union all select 'focus_master' where v_stats.focus_minutes >= 300
    union all select 'challenge_crusher' where (
      select count(*)
      from quest_assignments qa
      join quest_templates qt on qt.id = qa.template_id
      where qa.owner_id = p_owner and qa.status = 'completed' and qt.cadence = 'weekly'
    ) >= 3
    union all select 'academy_scholar' where v_stats.lessons_completed >= 10
    union all select 'iron_will' where v_stats.workouts_logged >= 20
    union all select 'goal_setter' where (
      select count(*) from user_goals where owner_id = p_owner and status = 'completed'
    ) >= 1
  ),
  inserted as (
    insert into user_achievements (owner_id, achievement_id)
    select p_owner, q.id
    from qualifying q
    join achievements a on a.id = q.id
    where not exists (
      select 1 from user_achievements ua
      where ua.owner_id = p_owner and ua.achievement_id = q.id
    )
    on conflict (owner_id, achievement_id) do nothing
    returning achievement_id
  )
  select coalesce(array_agg(achievement_id), '{}') into v_new_achievements from inserted;

  -- Achievement XP (idempotent) + events
  if array_length(v_new_achievements, 1) > 0 then
    insert into xp_transactions (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
    select p_owner, a.xp_reward, 'achievement', a.id, 'Achievement — ' || a.name,
           'achievement:' || a.id, a.attribute_weights
    from achievements a
    where a.id = any (v_new_achievements)
    on conflict (owner_id, idempotency_key) do nothing;

    insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
    select p_owner, 'achievement_earned', 'Achievement unlocked — ' || a.name, a.description,
           jsonb_build_object('achievement_id', a.id, 'xp', a.xp_reward), 'ach:' || a.id
    from achievements a
    where a.id = any (v_new_achievements)
    on conflict (owner_id, dedupe_key) do nothing;
  end if;

  -- Skills: iterate because unlocking one node can unlock the next ---------
  loop
    with owned as (
      select skill_id from user_skills where owner_id = p_owner and state = 'completed'
    ),
    done_quests as (
      select qt.path as path
      from quest_assignments qa
      join quest_templates qt on qt.id = qa.template_id
      where qa.owner_id = p_owner and qa.status = 'completed'
    ),
    qualifying as (
      select sd.id
      from skill_defs sd
      where not exists (
            select 1 from user_skills us
            where us.owner_id = p_owner and us.skill_id = sd.id and us.state = 'completed'
          )
        and not exists (
            select 1 from unnest(sd.prerequisites) p
            where p not in (select skill_id from owned)
          )
        and case sd.measure ->> 'kind'
              when 'quests' then (
                select count(*) from done_quests dq
                where dq.path = sd.measure ->> 'path'
              ) >= (sd.measure ->> 'target')::int
              when 'lessons' then (
                select count(*) from learning_progress lp
                where lp.owner_id = p_owner and lp.state = 'completed'
                  and (
                    coalesce(sd.measure -> 'paths', '[]'::jsonb) = '[]'::jsonb
                    or exists (
                      select 1
                      from jsonb_array_elements_text(coalesce(sd.measure -> 'paths', '[]'::jsonb)) as pfx(text)
                      where lp.lesson_id like (pfx.text || '%')
                    )
                  )
              ) >= (sd.measure ->> 'target')::int
              when 'workouts' then (
                select count(*) from workout_sessions where owner_id = p_owner
              ) >= (sd.measure ->> 'target')::int
              when 'journal' then (
                select count(*) from journal_entries where owner_id = p_owner
              ) >= (sd.measure ->> 'target')::int
              when 'focusMinutes' then (
                select coalesce(sum(minutes), 0) from focus_sessions
                where owner_id = p_owner and completed
              ) >= (sd.measure ->> 'target')::int
              when 'attribute' then coalesce((
                select value from user_attributes
                where owner_id = p_owner and attribute = sd.measure ->> 'attribute'
              ), 0) >= (sd.measure ->> 'target')::int
              when 'streak' then greatest(v_stats.current_streak, v_stats.longest_streak) >= (sd.measure ->> 'target')::int
              else false
            end
    ),
    inserted_skills as (
      insert into user_skills (owner_id, skill_id, state, unlocked_at, completed_at, updated_at)
      select p_owner, q.id, 'completed', now(), now(), now()
      from qualifying q
      on conflict (owner_id, skill_id) do nothing
      returning skill_id
    )
    select count(*) into v_skill_count from inserted_skills;

    exit when v_skill_count = 0;

    for v_skill in
      select sd.id, sd.path
      from skill_defs sd
      where sd.id in (select skill_id from user_skills where owner_id = p_owner and state = 'completed')
        and not exists (
          select 1 from progression_events pe
          where pe.owner_id = p_owner and pe.dedupe_key = 'skill:' || sd.id
        )
    loop
      insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
      values (
        p_owner,
        'skill_completed',
        'Skill mastered — ' || v_skill.id,
        null,
        jsonb_build_object('skill_id', v_skill.id, 'path', v_skill.path),
        'skill:' || v_skill.id
      )
      on conflict (owner_id, dedupe_key) do nothing;
    end loop;
  end loop;

  -- Keep attribute snapshots in sync with any achievement XP
  perform public.arise_refresh_attributes(p_owner);

  return v_new_achievements;
end;
$$;

-- --------------------------------------------------------- milestone events
create or replace function public.arise_milestone_events(
  p_owner uuid,
  p_level_before integer,
  p_rank_before text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats record;
  v_events jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  select * into v_stats from public.arise_stats(p_owner);

  if v_stats.level > p_level_before then
    insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
    values (
      p_owner, 'level_up', 'Level up — Level ' || v_stats.level,
      'Total XP: ' || v_stats.total_xp,
      jsonb_build_object('level', v_stats.level, 'total_xp', v_stats.total_xp),
      'levelup:' || v_stats.level
    )
    on conflict (owner_id, dedupe_key) do nothing;
  end if;

  if v_stats.rank <> coalesce(p_rank_before, 'E') then
    insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
    values (
      p_owner, 'rank_up', 'Rank up — ' || v_stats.rank,
      'You are now ' || v_stats.rank || '-ranked in the ARISE system.',
      jsonb_build_object('from', coalesce(p_rank_before, 'E'), 'to', v_stats.rank),
      'rankup:' || v_stats.rank
    )
    on conflict (owner_id, dedupe_key) do nothing;
  end if;

  if v_stats.current_streak in (3, 7, 14, 30, 50, 100, 365) then
    insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
    values (
      p_owner, 'streak_milestone', v_stats.current_streak || '-day streak',
      'Consistency is compounding.',
      jsonb_build_object('days', v_stats.current_streak),
      'streak:' || v_stats.current_streak
    )
    on conflict (owner_id, dedupe_key) do nothing;
  end if;

  select coalesce(jsonb_agg(to_jsonb(pe) - 'owner_id'), '[]'::jsonb)
  into v_row
  from progression_events pe
  where pe.owner_id = p_owner
    and (
      (pe.dedupe_key = 'levelup:' || v_stats.level and v_stats.level > p_level_before)
      or (pe.dedupe_key = 'rankup:' || v_stats.rank and v_stats.rank <> coalesce(p_rank_before, 'E'))
      or (pe.dedupe_key = 'streak:' || v_stats.current_streak and v_stats.current_streak in (3, 7, 14, 30, 50, 100, 365))
    );

  return coalesce(v_row, '[]'::jsonb);
end;
$$;

commit;
