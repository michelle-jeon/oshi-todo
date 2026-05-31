create table if not exists public.focus_window_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  work_date date not null,
  window_key text not null,
  display_name text not null,
  full_name text not null,
  seconds integer not null default 0 check (seconds >= 0),
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date, window_key)
);

create trigger focus_window_logs_touch_updated_at
before update on public.focus_window_logs
for each row execute function public.touch_updated_at();

alter table public.focus_window_logs enable row level security;

create policy "focus window logs are owned by user"
on public.focus_window_logs for select
using (user_id = auth.uid());

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
  safe_xp = least(greatest(xp_delta_input, 0), 60);

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
