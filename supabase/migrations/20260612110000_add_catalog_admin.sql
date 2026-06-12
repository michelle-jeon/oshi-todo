alter table public.profiles
add column if not exists is_admin boolean not null default false;

do $$
begin
  create type public.shop_item_unlock_method as enum ('gem', 'attendance', 'focus');
exception
  when duplicate_object then null;
end
$$;

alter table public.shop_items
add column if not exists description text,
add column if not exists thumbnail_url text,
add column if not exists unlock_method public.shop_item_unlock_method not null default 'gem',
add column if not exists unlock_requirement integer not null default 0 check (unlock_requirement >= 0),
add column if not exists available_from timestamptz,
add column if not exists available_until timestamptz,
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.shop_item_variants (
  id uuid primary key default gen_random_uuid(),
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  species public.character_species not null,
  slot public.inventory_item_slot not null,
  payload jsonb not null default '{}'::jsonb,
  layer_asset_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_item_id, species)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profiles.is_admin from public.profiles where profiles.id = auth.uid()),
    false
  );
$$;

drop policy if exists "shop items are public read" on public.shop_items;
create policy "available shop items are public read"
on public.shop_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.character_inventory
    join public.characters on characters.id = character_inventory.character_id
    where character_inventory.shop_item_id = shop_items.id
      and characters.user_id = auth.uid()
  )
  or (
    is_active = true
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now())
  )
);

drop policy if exists "admins manage shop items" on public.shop_items;
create policy "admins manage shop items"
on public.shop_items for all
using (public.is_admin())
with check (public.is_admin());

alter table public.shop_item_variants enable row level security;

drop policy if exists "available shop item variants are public read" on public.shop_item_variants;
create policy "available shop item variants are public read"
on public.shop_item_variants for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.character_inventory
    join public.characters on characters.id = character_inventory.character_id
    where character_inventory.shop_item_id = shop_item_variants.shop_item_id
      and characters.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.shop_items
    where shop_items.id = shop_item_variants.shop_item_id
      and shop_items.is_active = true
      and (shop_items.available_from is null or shop_items.available_from <= now())
      and (shop_items.available_until is null or shop_items.available_until > now())
  )
);

drop policy if exists "admins manage shop item variants" on public.shop_item_variants;
create policy "admins manage shop item variants"
on public.shop_item_variants for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can view profiles" on public.profiles;
create policy "admins can view profiles"
on public.profiles for select
using (public.is_admin());

drop trigger if exists shop_items_touch_updated_at on public.shop_items;
create trigger shop_items_touch_updated_at
before update on public.shop_items
for each row execute function public.touch_updated_at();

drop trigger if exists shop_item_variants_touch_updated_at on public.shop_item_variants;
create trigger shop_item_variants_touch_updated_at
before update on public.shop_item_variants
for each row execute function public.touch_updated_at();

create index if not exists shop_items_availability_idx
on public.shop_items(is_active, available_from, available_until);

create index if not exists shop_item_variants_species_slot_idx
on public.shop_item_variants(species, slot, shop_item_id);

insert into public.shop_item_variants (shop_item_id, species, slot, payload)
select id, species, slot, payload
from public.shop_items
where species is not null
on conflict (shop_item_id, species) do nothing;

delete from public.shop_items
where code in (
  'human_hair_bob_brown',
  'human_outfit_mint_hoodie',
  'cat_pattern_cheese',
  'human_eyes_bright',
  'human_eyes_calm',
  'human_accessory_ribbon',
  'cat_eyes_bright',
  'cat_eyes_calm',
  'cat_accessory_star_pin'
);

create or replace function public.purchase_shop_item(shop_item_id_input uuid)
returns public.character_inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  active_character public.characters;
  target_item public.shop_items;
  purchased_item public.character_inventory;
begin
  select *
  into active_character
  from public.characters
  where user_id = auth.uid()
    and is_active = true
  for update;

  if active_character.id is null then
    raise exception 'Active character not found';
  end if;

  select *
  into target_item
  from public.shop_items
  where id = shop_item_id_input
    and is_active = true
    and unlock_method = 'gem'
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now());

  if target_item.id is null then
    raise exception 'Shop item not found';
  end if;

  if not exists (
    select 1
    from public.shop_item_variants
    where shop_item_id = target_item.id
      and species = active_character.species
  ) and target_item.species is distinct from active_character.species then
    raise exception 'This item is not available for the active character species';
  end if;

  if active_character.xp_current < target_item.cost then
    raise exception 'Not enough XP';
  end if;

  if exists (
    select 1
    from public.character_inventory
    where character_id = active_character.id
      and shop_item_id = target_item.id
  ) then
    raise exception 'Item already purchased';
  end if;

  update public.characters
  set xp_current = xp_current - target_item.cost
  where id = active_character.id;

  insert into public.character_inventory (character_id, shop_item_id)
  values (active_character.id, target_item.id)
  returning * into purchased_item;

  return purchased_item;
end;
$$;
