create extension if not exists pgcrypto;

create type public.todo_status as enum ('open', 'completed', 'archived');
create type public.character_species as enum ('human', 'cat');
create type public.inventory_item_slot as enum (
  'human_hair',
  'human_outfit',
  'cat_pattern',
  'accessory',
  'room_item',
  'mount'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  species public.character_species not null,
  level integer not null default 1 check (level >= 1),
  xp_total integer not null default 0 check (xp_total >= 0),
  xp_current integer not null default 0 check (xp_current >= 0),
  is_active boolean not null default false,
  customization jsonb not null default '{}'::jsonb,
  room_customization jsonb not null default '{"furnitureIds":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index characters_one_active_per_user
  on public.characters(user_id)
  where is_active;

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  notes text,
  status public.todo_status not null default 'open',
  xp_reward integer not null default 10 check (xp_reward between 1 and 100),
  assigned_character_id uuid references public.characters(id) on delete set null,
  completed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  todo_id uuid references public.todos(id) on delete set null,
  amount integer not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (todo_id)
);

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slot public.inventory_item_slot not null,
  species public.character_species,
  cost integer not null check (cost >= 0),
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.character_inventory (
  character_id uuid not null references public.characters(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (character_id, shop_item_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger characters_touch_updated_at
before update on public.characters
for each row execute function public.touch_updated_at();

create trigger todos_touch_updated_at
before update on public.todos
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.characters (
    user_id,
    display_name,
    species,
    is_active,
    customization
  )
  values (
    new.id,
    '첫 번째 친구',
    'human',
    true,
    '{"species":"human","hairColor":"#5f3d2e","outfitColor":"#4f7cff"}'::jsonb
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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

  update public.todos
  set
    status = 'completed',
    completed_at = now(),
    assigned_character_id = active_character.id,
    version = version + 1
  where id = target_todo.id;

  update public.characters
  set
    xp_total = xp_total + target_todo.xp_reward,
    xp_current = xp_current + target_todo.xp_reward
  where id = active_character.id;

  insert into public.xp_events (user_id, character_id, todo_id, amount, reason)
  values (auth.uid(), active_character.id, target_todo.id, target_todo.xp_reward, 'todo_completed')
  returning * into created_event;

  return created_event;
end;
$$;

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.todos enable row level security;
alter table public.xp_events enable row level security;
alter table public.shop_items enable row level security;
alter table public.character_inventory enable row level security;

create policy "profiles are owned by user"
on public.profiles for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "characters are owned by user"
on public.characters for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "todos are owned by user"
on public.todos for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "xp events are visible to owner"
on public.xp_events for select
using (user_id = auth.uid());

create policy "shop items are public read"
on public.shop_items for select
using (is_active = true);

create policy "inventory follows character owner"
on public.character_inventory for select
using (
  exists (
    select 1 from public.characters
    where characters.id = character_inventory.character_id
      and characters.user_id = auth.uid()
  )
);

insert into public.shop_items (code, name, slot, species, cost, payload)
values
  ('human_hair_bob_brown', '브라운 단발', 'human_hair', 'human', 80, '{"hairStyle":"bob","hairColor":"#7a4a39"}'),
  ('human_outfit_mint_hoodie', '민트 후드', 'human_outfit', 'human', 80, '{"outfitColor":"#2f6f73"}'),
  ('cat_pattern_cheese', '치즈 줄무늬', 'cat_pattern', 'cat', 90, '{"patternColor":"#d8a333"}');
