alter table public.todos
add column if not exists base_xp_reward integer check (base_xp_reward between 1 and 100);

update public.todos
set base_xp_reward = xp_reward
where base_xp_reward is null;

alter table public.todos
alter column base_xp_reward set default 10,
alter column base_xp_reward set not null;

alter table public.routines
add column if not exists base_xp_reward integer check (base_xp_reward between 1 and 100);

update public.routines
set base_xp_reward = xp_reward
where base_xp_reward is null;

alter table public.routines
alter column base_xp_reward set default 10,
alter column base_xp_reward set not null;
