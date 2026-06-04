create or replace function public.get_daily_xp_cap()
returns integer
language sql
stable
as $$
  select 500;
$$;

create or replace function public.get_remaining_daily_xp(
  target_date_input date default (timezone('Asia/Seoul', now()))::date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  earned_xp integer;
begin
  select coalesce(sum(amount), 0)
  into earned_xp
  from public.xp_events
  where user_id = auth.uid()
    and (created_at at time zone 'Asia/Seoul')::date = target_date_input;

  return greatest(public.get_daily_xp_cap() - earned_xp, 0);
end;
$$;

create or replace function public.complete_todo(todo_id_input uuid)
returns public.xp_events
language plpgsql
security definer
set search_path = public
as $$
declare
  target_todo public.todos;
  active_character public.characters;
  created_event public.xp_events;
  awarded_xp integer;
begin
  select *
  into target_todo
  from public.todos
  where id = todo_id_input
    and user_id = auth.uid()
  for update;

  if target_todo.id is null then
    raise exception 'Todo not found';
  end if;

  if target_todo.status = 'completed' then
    raise exception 'Todo already completed';
  end if;

  select *
  into active_character
  from public.characters
  where user_id = auth.uid()
    and is_active = true
  for update;

  if active_character.id is null then
    raise exception 'Active character not found';
  end if;

  awarded_xp = least(
    target_todo.xp_reward,
    public.get_remaining_daily_xp((timezone('Asia/Seoul', now()))::date)
  );

  update public.todos
  set
    status = 'completed',
    completed_at = now(),
    assigned_character_id = active_character.id,
    version = version + 1
  where id = target_todo.id;

  if awarded_xp > 0 then
    update public.characters
    set
      xp_total = xp_total + awarded_xp,
      xp_current = xp_current + awarded_xp
    where id = active_character.id;

    insert into public.xp_events (user_id, character_id, todo_id, amount, reason)
    values (auth.uid(), active_character.id, target_todo.id, awarded_xp, 'todo_completed')
    returning * into created_event;
  end if;

  return created_event;
end;
$$;

create or replace function public.undo_complete_todo(todo_id_input uuid)
returns public.todos
language plpgsql
security definer
set search_path = public
as $$
declare
  target_todo public.todos;
  awarded_event public.xp_events;
  updated_todo public.todos;
begin
  select *
  into target_todo
  from public.todos
  where id = todo_id_input
    and user_id = auth.uid()
  for update;

  if target_todo.id is null then
    raise exception 'Todo not found';
  end if;

  if target_todo.status <> 'completed' then
    raise exception 'Todo is not completed';
  end if;

  select *
  into awarded_event
  from public.xp_events
  where todo_id = target_todo.id
    and user_id = auth.uid()
  for update;

  if awarded_event.id is not null then
    update public.characters
    set
      xp_total = greatest(xp_total - awarded_event.amount, 0),
      xp_current = greatest(xp_current - awarded_event.amount, 0)
    where id = awarded_event.character_id
      and user_id = auth.uid();

    delete from public.xp_events
    where id = awarded_event.id;
  end if;

  update public.todos
  set
    status = 'open',
    completed_at = null,
    assigned_character_id = null,
    version = version + 1
  where id = target_todo.id
  returning * into updated_todo;

  return updated_todo;
end;
$$;

create or replace function public.award_focus_xp(amount_input integer)
returns public.xp_events
language plpgsql
security definer
set search_path = public
as $$
declare
  active_character public.characters;
  created_event public.xp_events;
  safe_amount integer;
begin
  safe_amount = least(
    least(greatest(coalesce(amount_input, 0), 0), 10),
    public.get_remaining_daily_xp((timezone('Asia/Seoul', now()))::date)
  );

  select *
  into active_character
  from public.characters
  where user_id = auth.uid()
    and is_active = true
  for update;

  if active_character.id is null then
    raise exception 'Active character not found';
  end if;

  if safe_amount > 0 then
    update public.characters
    set
      xp_total = xp_total + safe_amount,
      xp_current = xp_current + safe_amount
    where id = active_character.id;

    insert into public.xp_events (user_id, character_id, amount, reason)
    values (auth.uid(), active_character.id, safe_amount, 'focus_window')
    returning * into created_event;
  end if;

  return created_event;
end;
$$;

create or replace function public.record_focus_window_progress(
  window_key_input text,
  display_name_input text,
  full_name_input text,
  seconds_delta_input integer,
  xp_delta_input integer,
  work_date_input date default (timezone('Asia/Seoul', now()))::date
)
returns public.focus_window_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  active_character public.characters;
  updated_log public.focus_window_logs;
  safe_seconds integer;
  safe_xp integer;
begin
  safe_seconds = least(greatest(seconds_delta_input, 0), 600);
  safe_xp = least(
    least(greatest(xp_delta_input, 0), 60),
    public.get_remaining_daily_xp(work_date_input)
  );

  if char_length(trim(window_key_input)) = 0 then
    raise exception 'Window key is required';
  end if;

  select *
  into active_character
  from public.characters
  where user_id = auth.uid()
    and is_active = true
  for update;

  if active_character.id is null then
    raise exception 'Active character not found';
  end if;

  if safe_xp > 0 then
    update public.characters
    set
      xp_total = xp_total + safe_xp,
      xp_current = xp_current + safe_xp
    where id = active_character.id;

    insert into public.xp_events (user_id, character_id, amount, reason)
    values (auth.uid(), active_character.id, safe_xp, 'focus_window');
  end if;

  insert into public.focus_window_logs (
    user_id,
    character_id,
    work_date,
    window_key,
    display_name,
    full_name,
    seconds,
    xp
  )
  values (
    auth.uid(),
    active_character.id,
    work_date_input,
    window_key_input,
    display_name_input,
    full_name_input,
    safe_seconds,
    safe_xp
  )
  on conflict (user_id, work_date, window_key)
  do update set
    character_id = excluded.character_id,
    display_name = excluded.display_name,
    full_name = excluded.full_name,
    seconds = public.focus_window_logs.seconds + excluded.seconds,
    xp = public.focus_window_logs.xp + excluded.xp,
    updated_at = now()
  returning * into updated_log;

  return updated_log;
end;
$$;
