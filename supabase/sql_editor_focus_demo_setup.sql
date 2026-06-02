-- 이 파일은 통합 실행용입니다.
-- 복사 중간 누락이 걱정되면 supabase/sql_editor 폴더의 01, 02, 03 파일을 순서대로 실행하세요.
-- SQL Editor에는 파일 경로가 아니라 파일 내용을 붙여넣어야 합니다.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $touch_updated_at$
begin
  new.updated_at = now();
  return new;
end;
$touch_updated_at$;

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

drop trigger if exists focus_window_logs_touch_updated_at on public.focus_window_logs;
create trigger focus_window_logs_touch_updated_at
before update on public.focus_window_logs
for each row execute function public.touch_updated_at();

alter table public.focus_window_logs enable row level security;

drop policy if exists "focus window logs are owned by user" on public.focus_window_logs;
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
as $record_focus_window_progress$
declare
  selected_character_id uuid;
  updated_log public.focus_window_logs;
  safe_seconds integer;
  safe_xp integer;
begin
  safe_seconds = least(greatest(seconds_delta_input, 0), 600);
  safe_xp = least(greatest(xp_delta_input, 0), 60);

  if char_length(trim(window_key_input)) = 0 then
    raise exception 'Window key is required';
  end if;

  select characters.id
  into selected_character_id
  from public.characters
  where characters.user_id = auth.uid()
    and characters.is_active = true
  for update;

  if selected_character_id is null then
    raise exception 'Active character not found';
  end if;

  if safe_xp > 0 then
    update public.characters
    set
      xp_total = xp_total + safe_xp,
      xp_current = xp_current + safe_xp
    where id = selected_character_id;

    insert into public.xp_events (user_id, character_id, amount, reason)
    values (auth.uid(), selected_character_id, safe_xp, 'focus_window');
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
    selected_character_id,
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
$record_focus_window_progress$;

do $$
begin
  if to_regclass('public.focus_window_logs') is not null then
    create index if not exists focus_window_logs_user_date_updated_idx
    on public.focus_window_logs(user_id, work_date desc, updated_at desc);
  end if;

  if to_regclass('public.xp_events') is not null then
    create index if not exists xp_events_user_created_idx
    on public.xp_events(user_id, created_at desc);
  end if;

  if to_regclass('public.character_inventory') is not null then
    create index if not exists character_inventory_purchased_idx
    on public.character_inventory(character_id, purchased_at desc);
  end if;

  if to_regclass('public.shop_items') is not null then
    create index if not exists shop_items_active_species_slot_cost_idx
    on public.shop_items(is_active, species, slot, cost);
  end if;

  if to_regclass('public.friendships') is not null then
    create index if not exists friendships_following_idx
    on public.friendships(following_id, follower_id);
  end if;

  if to_regclass('public.plaza_rooms') is not null then
    create index if not exists plaza_rooms_owner_created_idx
    on public.plaza_rooms(owner_id, created_at desc);
  end if;
end $$;

do $$
declare
  target_user_id uuid;
  target_character_id uuid;
begin
  select profiles.id
  into target_user_id
  from public.profiles
  order by profiles.created_at desc
  limit 1;

  if target_user_id is null then
    raise exception '더미 데이터를 넣을 profile이 없습니다. 먼저 앱에 로그인해 profile을 만들어 주세요.';
  end if;

  select characters.id
  into target_character_id
  from public.characters
  where characters.user_id = target_user_id
    and characters.is_active = true
  order by characters.created_at desc
  limit 1;

  if target_character_id is null then
    select characters.id
    into target_character_id
    from public.characters
    where characters.user_id = target_user_id
    order by characters.created_at desc
    limit 1;
  end if;

  if target_character_id is not null then
    update public.characters
    set is_active = true
    where id = target_character_id;
  else
    insert into public.characters (
      user_id,
      display_name,
      species,
      is_active,
      customization
    )
    values (
      target_user_id,
      '작업시간 더미 친구',
      'human',
      true,
      '{"species":"human","variantId":"blue","hairColor":"#5f3d2e","outfitColor":"#4f7cff"}'::jsonb
    )
    returning id into target_character_id;
  end if;

  create temp table demo_focus_logs (
    work_date date,
    window_key text,
    display_name text,
    full_name text,
    seconds integer,
    xp integer
  ) on commit drop;

  insert into demo_focus_logs (work_date, window_key, display_name, full_name, seconds, xp)
  values
    ((timezone('Asia/Seoul', now()))::date - 0, 'custom:인프런', '인프런', '인프런 강의 수강', 5400, 54),
    ((timezone('Asia/Seoul', now()))::date - 0, 'custom:oshitodo', 'OshiTodo', 'OshiTodo 개발', 2100, 21),
    ((timezone('Asia/Seoul', now()))::date - 1, 'custom:figma', 'Figma', 'Figma 화면 정리', 3600, 36),
    ((timezone('Asia/Seoul', now()))::date - 1, 'custom:문서정리', '문서정리', '기획 문서 정리', 1800, 18),
    ((timezone('Asia/Seoul', now()))::date - 2, 'custom:vscode', 'VS Code', 'VS Code 코딩', 4500, 45),
    ((timezone('Asia/Seoul', now()))::date - 3, 'custom:인프런', '인프런', '인프런 강의 수강', 3000, 30),
    ((timezone('Asia/Seoul', now()))::date - 4, 'custom:notion', 'Notion', 'Notion 회고 작성', 2400, 24),
    ((timezone('Asia/Seoul', now()))::date - 6, 'custom:vscode', 'VS Code', 'VS Code 코딩', 6000, 60),
    ((timezone('Asia/Seoul', now()))::date - 8, 'custom:figma', 'Figma', 'Figma 화면 정리', 2700, 27),
    ((timezone('Asia/Seoul', now()))::date - 10, 'custom:문서정리', '문서정리', '기획 문서 정리', 1500, 15),
    ((timezone('Asia/Seoul', now()))::date - 12, 'custom:인프런', '인프런', '인프런 강의 수강', 3900, 39);

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
  select
    target_user_id,
    target_character_id,
    work_date,
    window_key,
    display_name,
    full_name,
    seconds,
    xp
  from demo_focus_logs
  on conflict (user_id, work_date, window_key)
  do update set
    character_id = excluded.character_id,
    display_name = excluded.display_name,
    full_name = excluded.full_name,
    seconds = excluded.seconds,
    xp = excluded.xp,
    updated_at = now();
end $$;
