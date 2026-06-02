-- 3단계: 최근 작업시간 더미 기록을 넣습니다.
-- 1단계와 2단계가 성공한 뒤 Supabase SQL Editor의 새 쿼리 창에서 실행하세요.

do $demo_focus_logs$
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
end;
$demo_focus_logs$;

select '03_demo_focus_logs 완료' as status;
