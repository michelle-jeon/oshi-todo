alter table public.profiles
add column if not exists email text;

update public.profiles
set email = auth.users.email
from auth.users
where profiles.id = auth.users.id
  and profiles.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  weekdays integer[] not null default '{}',
  xp_reward integer not null default 10 check (xp_reward between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger routines_touch_updated_at
before update on public.routines
for each row execute function public.touch_updated_at();

create table if not exists public.friendships (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.plaza_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  invite_code text not null default replace(left(gen_random_uuid()::text, 8), '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plaza_rooms_touch_updated_at
before update on public.plaza_rooms
for each row execute function public.touch_updated_at();

alter table public.routines enable row level security;
alter table public.friendships enable row level security;
alter table public.plaza_rooms enable row level security;

create policy "authenticated profiles can be searched"
on public.profiles for select
using (auth.uid() is not null);

create policy "routines are owned by user"
on public.routines for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "friendships are owned by follower"
on public.friendships for all
using (follower_id = auth.uid())
with check (follower_id = auth.uid());

create policy "users can see incoming follows"
on public.friendships for select
using (following_id = auth.uid());

create policy "users can manage own plaza rooms"
on public.plaza_rooms for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "authenticated can browse public plaza rooms"
on public.plaza_rooms for select
using (
  visibility = 'public'
  or owner_id = auth.uid()
  or exists (
    select 1
    from public.friendships
    where friendships.follower_id = auth.uid()
      and friendships.following_id = plaza_rooms.owner_id
  )
);
