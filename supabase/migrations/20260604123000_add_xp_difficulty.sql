alter table public.todos
add column if not exists xp_difficulty text not null default 'medium';

alter table public.todos
drop constraint if exists todos_xp_difficulty_check;

alter table public.todos
add constraint todos_xp_difficulty_check
check (xp_difficulty in ('low', 'medium', 'high'));

alter table public.routines
add column if not exists xp_difficulty text not null default 'medium';

alter table public.routines
drop constraint if exists routines_xp_difficulty_check;

alter table public.routines
add constraint routines_xp_difficulty_check
check (xp_difficulty in ('low', 'medium', 'high'));

update public.todos
set
  xp_reward = case xp_difficulty
    when 'low' then 5
    when 'high' then 50
    else 20
  end,
  base_xp_reward = case xp_difficulty
    when 'low' then 5
    when 'high' then 50
    else 20
  end;

update public.routines
set
  xp_reward = case xp_difficulty
    when 'low' then 5
    when 'high' then 50
    else 20
  end,
  base_xp_reward = case xp_difficulty
    when 'low' then 5
    when 'high' then 50
    else 20
  end;
