-- ===========================================================================
-- ARISE — 0003_operations.sql
-- Client-facing RPCs. Each one:
--   * resolves the caller with auth.uid() and refuses unauthenticated use,
--   * validates ownership and eligibility server-side,
--   * computes rewards from quest_templates / lesson_defs configuration
--     (never from values supplied by the browser),
--   * writes idempotently (unique keys + guarded updates) so retries and
--     double-clicks can never double-pay,
--   * returns the authoritative updated totals plus the events it created.
-- ===========================================================================

begin;

-- -------------------------------------------------------------- bootstrap
create or replace function public.arise_bootstrap()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', to_jsonb(p.*),
    'assignments', coalesce((select jsonb_agg(to_jsonb(qa) order by qa.assigned_date desc)
                             from quest_assignments qa where qa.owner_id = p.id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(xt) order by xt.created_at desc)
                               from xp_transactions xt where xt.owner_id = p.id), '[]'::jsonb),
    'attributes', coalesce((select jsonb_agg(to_jsonb(ua))
                            from user_attributes ua where ua.owner_id = p.id), '[]'::jsonb),
    'skills', coalesce((select jsonb_agg(to_jsonb(us))
                        from user_skills us where us.owner_id = p.id), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(uach))
                              from user_achievements uach where uach.owner_id = p.id), '[]'::jsonb),
    'workouts', coalesce((select jsonb_agg(to_jsonb(ws) order by ws.session_date desc)
                          from workout_sessions ws where ws.owner_id = p.id), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(to_jsonb(lp))
                         from learning_progress lp where lp.owner_id = p.id), '[]'::jsonb),
    'journal', coalesce((select jsonb_agg(to_jsonb(je) order by je.created_at desc)
                         from journal_entries je where je.owner_id = p.id), '[]'::jsonb),
    'focusSessions', coalesce((select jsonb_agg(to_jsonb(fs) order by fs.created_at desc)
                               from focus_sessions fs where fs.owner_id = p.id), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(to_jsonb(ug) order by ug.created_at desc)
                       from user_goals ug where ug.owner_id = p.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(pe) order by pe.created_at desc)
                        from progression_events pe where pe.owner_id = p.id limit 400), '[]'::jsonb)
  )
  from profiles p
  where p.id = auth.uid();
$$;

-- --------------------------------------------------------------- sync day
-- p_plan: array of { template_id, assigned_date, cadence } chosen by the
-- deterministic client generator. The server re-validates every entry against
-- eligibility rules before inserting; uniqueness makes the call idempotent.
create or replace function public.arise_sync_day(p_plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_level integer;
  v_active text[];
  v_element jsonb;
  v_template public.quest_templates%rowtype;
  v_created integer := 0;
  v_expired integer := 0;
  v_week_start date;
  v_completed_skills text[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_today := public.arise_today(v_uid);
  v_week_start := v_today - ((extract(dow from v_today)::int + 6) % 7);

  select public.arise_level_from_xp(coalesce(sum(amount), 0))
  into v_level
  from xp_transactions where owner_id = v_uid;

  select coalesce(array(
    select value #>> '{}'
    from jsonb_array_elements(coalesce((select preferences -> 'activePaths' from profiles where id = v_uid), '[]'::jsonb))
  ), '{}') into v_active;

  select coalesce(array_agg(skill_id), '{}')
  into v_completed_skills
  from user_skills where owner_id = v_uid and state = 'completed';

  -- Expire stale, uncompleted assignments (no penalty; history is preserved).
  update quest_assignments
  set status = 'expired'
  where owner_id = v_uid
    and status in ('available', 'in_progress')
    and (
      (cadence = 'daily' and assigned_date < v_today)
      or (cadence = 'weekly' and assigned_date < v_week_start)
    );
  get diagnostics v_expired = row_count;

  for v_element in select * from jsonb_array_elements(coalesce(p_plan, '[]'::jsonb))
  loop
    select * into v_template
    from quest_templates
    where id = v_element ->> 'template_id';

    if not found then
      continue;
    end if;

    if v_template.path <> all (v_active) then
      continue;
    end if;

    if v_template.min_level > coalesce(v_level, 1) then
      continue;
    end if;

    if v_template.requires_skills is not null and array_length(v_template.requires_skills, 1) > 0
       and not (v_template.requires_skills <@ v_completed_skills) then
      continue;
    end if;

    if (v_element ->> 'cadence') = 'weekly' then
      if v_template.cadence <> 'weekly' or (v_element ->> 'assigned_date')::date <> v_week_start then
        continue;
      end if;
    else
      if v_template.cadence <> 'daily' or (v_element ->> 'assigned_date')::date <> v_today then
        continue;
      end if;
      -- Cap generated volume to a sane bound.
      if (select count(*) from quest_assignments
          where owner_id = v_uid and assigned_date = v_today) >= 12 then
        continue;
      end if;
    end if;

    insert into quest_assignments (owner_id, template_id, assigned_date, cadence, status)
    values (v_uid, v_template.id, (v_element ->> 'assigned_date')::date,
            v_template.cadence, 'available')
    on conflict (owner_id, template_id, assigned_date) do nothing;

    if found then
      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object('created', v_created, 'expired', v_expired);
end;
$$;

-- ---------------------------------------------------------- complete quest
create or replace function public.arise_complete_quest(
  p_assignment_id uuid,
  p_evidence text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment public.quest_assignments%rowtype;
  v_template public.quest_templates%rowtype;
  v_before record;
  v_after record;
  v_xp integer;
  v_new_achievements text[];
  v_events jsonb := '[]'::jsonb;
  v_row jsonb;
  v_week_start date;
  v_skills text[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_assignment from quest_assignments where id = p_assignment_id;
  if not found or v_assignment.owner_id <> v_uid then
    raise exception 'quest_not_found';
  end if;

  select * into v_template from quest_templates where id = v_assignment.template_id;
  select * into v_before from public.arise_stats(v_uid);

  -- Idempotent retry: already applied → report, never pay again.
  if v_assignment.status = 'completed' then
    return jsonb_build_object(
      'xp_gained', 0, 'duplicate', true,
      'level_before', v_before.level, 'level_after', v_before.level,
      'rank_before', v_before.rank, 'rank_after', v_before.rank,
      'events', '[]'::jsonb, 'new_achievements', '[]'::jsonb
    );
  end if;

  if v_assignment.status in ('expired', 'skipped') then
    raise exception 'quest_expired';
  end if;

  if v_template.min_level > v_before.level then
    raise exception 'level_too_low';
  end if;

  v_week_start := public.arise_today(v_uid) - ((extract(dow from public.arise_today(v_uid))::int + 6) % 7);
  if v_assignment.cadence = 'daily' and v_assignment.assigned_date <> public.arise_today(v_uid) then
    raise exception 'quest_expired';
  end if;
  if v_assignment.cadence = 'weekly'
     and (v_assignment.assigned_date > public.arise_today(v_uid)
          or v_assignment.assigned_date < v_week_start) then
    raise exception 'quest_expired';
  end if;

  select coalesce(array_agg(skill_id), '{}') into v_skills
  from user_skills where owner_id = v_uid and state = 'completed';
  if v_template.requires_skills is not null
     and not (v_template.requires_skills <@ v_skills) then
    raise exception 'requires_skill';
  end if;

  -- Authoritative reward from configuration (never the client).
  v_xp := coalesce(
    v_template.xp_reward,
    case v_template.cadence
      when 'weekly' then case v_template.difficulty when 'easy' then 75 when 'medium' then 100 else 150 end
      else case v_template.difficulty when 'easy' then 10 when 'medium' then 25 else 50 end
    end
  );

  perform set_config('arise.internal', '1', true);

  -- Guarded update: the `status <> 'completed'` predicate makes this atomic —
  -- a concurrent duplicate simply matches no rows.
  update quest_assignments
  set status = 'completed',
      completed_at = now(),
      accepted_at = coalesce(accepted_at, now()),
      xp_awarded = v_xp,
      evidence = p_evidence,
      notes = coalesce(p_notes, notes)
  where id = p_assignment_id and status <> 'completed';
  if not found then
    return jsonb_build_object(
      'xp_gained', 0, 'duplicate', true,
      'level_before', v_before.level, 'level_after', v_before.level,
      'rank_before', v_before.rank, 'rank_after', v_before.rank,
      'events', '[]'::jsonb, 'new_achievements', '[]'::jsonb
    );
  end if;

  insert into xp_transactions (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
  values (
    v_uid, v_xp,
    case when v_template.cadence = 'weekly' then 'challenge' else 'quest' end,
    p_assignment_id::text, v_template.title, 'quest:' || p_assignment_id, v_template.attribute_weights
  )
  on conflict (owner_id, idempotency_key) do nothing;

  insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
  values (
    v_uid, 'quest_completed',
    'Quest complete — ' || v_template.title,
    '+' || v_xp || ' XP · ' || upper(v_template.path) || ' · ' || v_template.difficulty,
    jsonb_build_object('assignment_id', p_assignment_id, 'xp', v_xp, 'path', v_template.path),
    'quest:' || p_assignment_id
  )
  on conflict (owner_id, dedupe_key) do nothing
  returning to_jsonb(progression_events.*) - 'owner_id' into v_row;
  v_events := v_events || coalesce(v_row, '[]'::jsonb);

  perform public.arise_refresh_attributes(v_uid);
  v_new_achievements := public.arise_evaluate_progress(v_uid);
  v_events := v_events || public.arise_milestone_events(v_uid, v_before.level, v_before.rank);

  select * into v_after from public.arise_stats(v_uid);

  return jsonb_build_object(
    'xp_gained', v_xp,
    'duplicate', false,
    'level_before', v_before.level, 'level_after', v_after.level,
    'rank_before', v_before.rank, 'rank_after', v_after.rank,
    'events', coalesce(v_events, '[]'::jsonb),
    'new_achievements', coalesce(v_new_achievements, '{}')
  );
end;
$$;

-- --------------------------------------------------------- complete lesson
create or replace function public.arise_complete_lesson(
  p_lesson_id text,
  p_quiz_score integer default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before record;
  v_after record;
  v_xp integer;
  v_existing public.learning_progress%rowtype;
  v_new_achievements text[];
  v_events jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_before from public.arise_stats(v_uid);

  -- XP comes from the seeded lesson table, never from the client.
  select xp_reward into v_xp from lesson_defs where id = p_lesson_id;
  if not found then
    raise exception 'lesson_not_found';
  end if;

  select * into v_existing
  from learning_progress where owner_id = v_uid and lesson_id = p_lesson_id;

  if v_existing.state = 'completed' then
    -- Re-taking refreshes the score without paying again.
    update learning_progress
    set quiz_score = coalesce(p_quiz_score, quiz_score),
        quiz_attempts = quiz_attempts + case when p_quiz_score is not null then 1 else 0 end,
        notes = coalesce(p_notes, notes),
        updated_at = now()
    where owner_id = v_uid and lesson_id = p_lesson_id;

    return jsonb_build_object(
      'xp_gained', 0, 'duplicate', true,
      'level_before', v_before.level, 'level_after', v_before.level,
      'rank_before', v_before.rank, 'rank_after', v_before.rank,
      'events', '[]'::jsonb, 'new_achievements', '[]'::jsonb
    );
  end if;

  insert into learning_progress (owner_id, lesson_id, state, quiz_score, quiz_attempts, notes, completed_at, updated_at)
  values (v_uid, p_lesson_id, 'completed', p_quiz_score,
          case when p_quiz_score is not null then 1 else 0 end, p_notes, now(), now())
  on conflict (owner_id, lesson_id) do update
    set state = 'completed',
        quiz_score = coalesce(excluded.quiz_score, learning_progress.quiz_score),
        quiz_attempts = learning_progress.quiz_attempts + excluded.quiz_attempts,
        notes = coalesce(excluded.notes, learning_progress.notes),
        completed_at = coalesce(learning_progress.completed_at, now()),
        updated_at = now();

  insert into xp_transactions (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
  values (v_uid, v_xp, 'lesson', p_lesson_id, 'Lesson — ' || p_lesson_id,
          'lesson:' || p_lesson_id, '{"technical":0.7,"problemSolving":0.3}'::jsonb)
  on conflict (owner_id, idempotency_key) do nothing;

  insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
  values (
    v_uid, 'lesson_completed', 'Lesson complete — ' || p_lesson_id,
    '+' || v_xp || ' XP',
    jsonb_build_object('lesson_id', p_lesson_id, 'xp', v_xp, 'quiz_score', p_quiz_score),
    'lesson:' || p_lesson_id
  )
  on conflict (owner_id, dedupe_key) do nothing
  returning to_jsonb(progression_events.*) - 'owner_id' into v_row;
  v_events := v_events || coalesce(v_row, '[]'::jsonb);

  perform public.arise_refresh_attributes(v_uid);
  v_new_achievements := public.arise_evaluate_progress(v_uid);
  v_events := v_events || public.arise_milestone_events(v_uid, v_before.level, v_before.rank);

  select * into v_after from public.arise_stats(v_uid);

  return jsonb_build_object(
    'xp_gained', v_xp,
    'duplicate', false,
    'level_before', v_before.level, 'level_after', v_after.level,
    'rank_before', v_before.rank, 'rank_after', v_after.rank,
    'events', coalesce(v_events, '[]'::jsonb),
    'new_achievements', coalesce(v_new_achievements, '{}')
  );
end;
$$;

-- ------------------------------------------------------------ log workout
create or replace function public.arise_log_workout(
  p_date date,
  p_title text,
  p_path text default 'vitality',
  p_focus text[] default '{}',
  p_duration integer default 30,
  p_intensity text default 'moderate',
  p_exercises jsonb default '[]'::jsonb,
  p_notes text default null,
  p_template_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before record;
  v_after record;
  v_id uuid;
  v_xp integer;
  v_weights jsonb;
  v_new_achievements text[];
  v_events jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_duration is null or p_duration < 1 or p_duration > 600 then
    raise exception 'invalid_duration';
  end if;
  if p_date is null or p_date > public.arise_today(v_uid) or p_date < public.arise_today(v_uid) - 90 then
    raise exception 'invalid_date';
  end if;

  select * into v_before from public.arise_stats(v_uid);

  -- Mirror of WORKOUT_XP + workoutWeights() in src/core/progression.ts
  v_xp := case p_intensity when 'light' then 20 when 'vigorous' then 40 else 30 end;
  v_weights := case
    when 'endurance' = any (p_focus) and not ('strength' = any (p_focus))
      then '{"endurance":0.7,"mobility":0.2,"discipline":0.1}'::jsonb
    when p_focus = array['mobility']::text[]
      then '{"mobility":0.7,"discipline":0.2,"endurance":0.1}'::jsonb
    when 'strength' = any (p_focus) and 'endurance' = any (p_focus)
      then '{"strength":0.45,"endurance":0.4,"mobility":0.1,"discipline":0.05}'::jsonb
    when 'strength' = any (p_focus)
      then '{"strength":0.7,"endurance":0.2,"discipline":0.1}'::jsonb
    else '{"strength":0.4,"endurance":0.4,"mobility":0.1,"discipline":0.1}'::jsonb
  end;

  insert into workout_sessions (owner_id, session_date, template_id, title, path, focus, duration_minutes, intensity, exercises, notes)
  values (v_uid, p_date, p_template_id, coalesce(nullif(p_title, ''), 'Training session'),
          coalesce(p_path, 'vitality'), coalesce(p_focus, '{}'), p_duration,
          coalesce(p_intensity, 'moderate'), coalesce(p_exercises, '[]'::jsonb), p_notes)
  returning id into v_id;

  insert into xp_transactions (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
  values (v_uid, v_xp, 'workout', v_id::text, 'Training — ' || coalesce(p_title, 'Session'),
          'workout:' || v_id, v_weights)
  on conflict (owner_id, idempotency_key) do nothing;

  insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
  values (
    v_uid, 'workout_logged', 'Training logged — ' || coalesce(p_title, 'Session'),
    '+' || v_xp || ' XP · ' || p_duration || ' min · ' || coalesce(p_intensity, 'moderate'),
    jsonb_build_object('session_id', v_id, 'xp', v_xp),
    'workout:' || v_id
  )
  on conflict (owner_id, dedupe_key) do nothing
  returning to_jsonb(progression_events.*) - 'owner_id' into v_row;
  v_events := v_events || coalesce(v_row, '[]'::jsonb);

  perform public.arise_refresh_attributes(v_uid);
  v_new_achievements := public.arise_evaluate_progress(v_uid);
  v_events := v_events || public.arise_milestone_events(v_uid, v_before.level, v_before.rank);

  select * into v_after from public.arise_stats(v_uid);

  return jsonb_build_object(
    'xp_gained', v_xp,
    'duplicate', false,
    'level_before', v_before.level, 'level_after', v_after.level,
    'rank_before', v_before.rank, 'rank_after', v_after.rank,
    'events', coalesce(v_events, '[]'::jsonb),
    'new_achievements', coalesce(v_new_achievements, '{}')
  );
end;
$$;

-- ---------------------------------------------------------- log reflection
create or replace function public.arise_log_reflection(
  p_date date,
  p_content text,
  p_prompt text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before record;
  v_after record;
  v_id uuid;
  v_xp integer := 0;
  v_new_achievements text[];
  v_events jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_content is null or length(trim(p_content)) < 10 then
    raise exception 'reflection_too_short';
  end if;
  if p_date is null or p_date > public.arise_today(v_uid) or p_date < public.arise_today(v_uid) - 30 then
    raise exception 'invalid_date';
  end if;

  select * into v_before from public.arise_stats(v_uid);

  insert into journal_entries (owner_id, entry_date, content, prompt)
  values (v_uid, p_date, trim(p_content), p_prompt)
  returning id into v_id;

  -- One reflection pays XP per day; extra entries are still saved.
  if not exists (
    select 1 from xp_transactions
    where owner_id = v_uid and idempotency_key = 'journal:' || p_date::text
  ) then
    v_xp := 10;
    insert into xp_transactions (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
    values (v_uid, 10, 'quest', 'reflection:' || p_date::text, 'Daily reflection',
            'journal:' || p_date::text, '{"discipline":1}'::jsonb);
  end if;

  insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
  values (
    v_uid, 'quest_completed', 'Reflection recorded',
    case when v_xp > 0 then '+10 XP · DISCIPLINE' else 'Extra entries are saved without extra XP.' end,
    jsonb_build_object('entry_id', v_id),
    'journal:' || v_id
  )
  on conflict (owner_id, dedupe_key) do nothing
  returning to_jsonb(progression_events.*) - 'owner_id' into v_row;
  v_events := v_events || coalesce(v_row, '[]'::jsonb);

  perform public.arise_refresh_attributes(v_uid);
  v_new_achievements := public.arise_evaluate_progress(v_uid);
  v_events := v_events || public.arise_milestone_events(v_uid, v_before.level, v_before.rank);

  select * into v_after from public.arise_stats(v_uid);

  return jsonb_build_object(
    'xp_gained', v_xp,
    'duplicate', false,
    'level_before', v_before.level, 'level_after', v_after.level,
    'rank_before', v_before.rank, 'rank_after', v_after.rank,
    'events', coalesce(v_events, '[]'::jsonb),
    'new_achievements', coalesce(v_new_achievements, '{}')
  );
end;
$$;

-- ------------------------------------------------------------- log focus
create or replace function public.arise_log_focus(
  p_date date,
  p_minutes integer,
  p_label text default 'Focus session',
  p_completed boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before record;
  v_after record;
  v_id uuid;
  v_xp integer := 0;
  v_new_achievements text[];
  v_events jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 600 then
    raise exception 'invalid_duration';
  end if;
  if p_date is null or p_date > public.arise_today(v_uid) or p_date < public.arise_today(v_uid) - 30 then
    raise exception 'invalid_date';
  end if;

  select * into v_before from public.arise_stats(v_uid);

  insert into focus_sessions (owner_id, session_date, minutes, label, completed)
  values (v_uid, p_date, p_minutes, coalesce(nullif(p_label, ''), 'Focus session'), coalesce(p_completed, true))
  returning id into v_id;

  if coalesce(p_completed, true) then
    -- Mirror of the TS formula: min(40, max(5, round(minutes × 1.5)))
    v_xp := least(40, greatest(5, round(p_minutes * 1.5)::int));
    insert into xp_transactions (owner_id, amount, source_type, source_ref, source_label, idempotency_key, attribute_weights)
    values (v_uid, v_xp, 'focus', v_id::text, 'Focus — ' || coalesce(p_label, 'Focus session'),
            'focus:' || v_id, '{"discipline":1}'::jsonb)
    on conflict (owner_id, idempotency_key) do nothing;

    insert into progression_events (owner_id, event_type, title, detail, payload, dedupe_key)
    values (
      v_uid, 'quest_completed', 'Focus session complete — ' || coalesce(p_label, 'Focus session'),
      '+' || v_xp || ' XP · ' || p_minutes || ' min',
      jsonb_build_object('session_id', v_id, 'minutes', p_minutes),
      'focus:' || v_id
    )
    on conflict (owner_id, dedupe_key) do nothing
    returning to_jsonb(progression_events.*) - 'owner_id' into v_row;
    v_events := v_events || coalesce(v_row, '[]'::jsonb);
  end if;

  perform public.arise_refresh_attributes(v_uid);
  v_new_achievements := public.arise_evaluate_progress(v_uid);
  v_events := v_events || public.arise_milestone_events(v_uid, v_before.level, v_before.rank);

  select * into v_after from public.arise_stats(v_uid);

  return jsonb_build_object(
    'xp_gained', v_xp,
    'duplicate', false,
    'level_before', v_before.level, 'level_after', v_after.level,
    'rank_before', v_before.rank, 'rank_after', v_after.rank,
    'events', coalesce(v_events, '[]'::jsonb),
    'new_achievements', coalesce(v_new_achievements, '{}')
  );
end;
$$;

-- -------------------------------------------------------- set goal status
create or replace function public.arise_set_goal_status(p_goal_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before record;
  v_after record;
  v_new_achievements text[];
  v_events jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_status not in ('active', 'completed', 'archived') then
    raise exception 'invalid_status';
  end if;

  select * into v_before from public.arise_stats(v_uid);

  update user_goals set status = p_status
  where id = p_goal_id and owner_id = v_uid;
  if not found then
    raise exception 'goal_not_found';
  end if;

  v_new_achievements := public.arise_evaluate_progress(v_uid);
  v_events := public.arise_milestone_events(v_uid, v_before.level, v_before.rank);
  select * into v_after from public.arise_stats(v_uid);

  return jsonb_build_object(
    'xp_gained', 0,
    'duplicate', false,
    'level_before', v_before.level, 'level_after', v_after.level,
    'rank_before', v_before.rank, 'rank_after', v_after.rank,
    'events', coalesce(v_events, '[]'::jsonb),
    'new_achievements', coalesce(v_new_achievements, '{}')
  );
end;
$$;

-- --------------------------------------------------------- delete account
create or replace function public.arise_delete_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- Cascades to every user-owned table.
  delete from auth.users where id = v_uid;
  return jsonb_build_object('deleted', true);
end;
$$;

-- ---------------------------------------------------------------- grants
revoke execute on function public.arise_bootstrap() from public, anon;
revoke execute on function public.arise_sync_day(jsonb) from public, anon;
revoke execute on function public.arise_complete_quest(uuid, text, text) from public, anon;
revoke execute on function public.arise_complete_lesson(text, integer, text) from public, anon;
revoke execute on function public.arise_log_workout(date, text, text, text[], integer, text, jsonb, text, text) from public, anon;
revoke execute on function public.arise_log_reflection(date, text, text) from public, anon;
revoke execute on function public.arise_log_focus(date, integer, text, boolean) from public, anon;
revoke execute on function public.arise_set_goal_status(uuid, text) from public, anon;
revoke execute on function public.arise_delete_account() from public, anon;

grant execute on function public.arise_bootstrap() to authenticated;
grant execute on function public.arise_sync_day(jsonb) to authenticated;
grant execute on function public.arise_complete_quest(uuid, text, text) to authenticated;
grant execute on function public.arise_complete_lesson(text, integer, text) to authenticated;
grant execute on function public.arise_log_workout(date, text, text, text[], integer, text, jsonb, text, text) to authenticated;
grant execute on function public.arise_log_reflection(date, text, text) to authenticated;
grant execute on function public.arise_log_focus(date, integer, text, boolean) to authenticated;
grant execute on function public.arise_set_goal_status(uuid, text) to authenticated;
grant execute on function public.arise_delete_account() to authenticated;

-- Internal helpers: SECURITY DEFINER functions that take an arbitrary owner
-- id and mutate that owner's rows. They are only ever called from inside the
-- RPCs above (which run as the function owner and therefore keep access).
-- Clients must not invoke them directly — arise_milestone_events in
-- particular would let any authenticated user inject fake level-up events
-- into another user's history.
revoke execute on function public.arise_stats(uuid) from public, anon, authenticated;
revoke execute on function public.arise_refresh_attributes(uuid) from public, anon, authenticated;
revoke execute on function public.arise_evaluate_progress(uuid) from public, anon, authenticated;
revoke execute on function public.arise_milestone_events(uuid, integer, text) from public, anon, authenticated;

commit;

-- ===========================================================================
-- Security self-checks (run as an authenticated user in the SQL editor):
--   1. Call arise_complete_quest with someone else's assignment id →
--      must raise 'quest_not_found'.
--   2. update public.quest_assignments set status='completed' directly →
--      must raise the guard trigger exception.
--   3. insert into public.xp_transactions directly → must be denied by RLS.
-- ===========================================================================
