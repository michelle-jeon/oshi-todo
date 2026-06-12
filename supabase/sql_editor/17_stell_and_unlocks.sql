alter table public.characters
add column if not exists stell_balance integer not null default 0 check (stell_balance >= 0);

update public.characters
set stell_balance = xp_current
where stell_balance = 0
  and xp_current > 0;

alter table public.shop_items
add column if not exists required_level integer not null default 1 check (required_level >= 1);

create or replace function public.get_level_from_total_xp(total_xp_input integer)
returns integer
language sql
immutable
as $$
  select case
    when total_xp_input >= 2040 then 11
    when total_xp_input >= 1660 then 10
    when total_xp_input >= 1320 then 9
    when total_xp_input >= 1020 then 8
    when total_xp_input >= 760 then 7
    when total_xp_input >= 540 then 6
    when total_xp_input >= 360 then 5
    when total_xp_input >= 220 then 4
    when total_xp_input >= 120 then 3
    when total_xp_input >= 50 then 2
    else 1
  end;
$$;

create or replace function public.sync_stell_from_xp_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.characters
    set stell_balance = stell_balance + new.amount
    where id = new.character_id;
    return new;
  end if;

  update public.characters
  set stell_balance = greatest(stell_balance - old.amount, 0)
  where id = old.character_id;
  return old;
end;
$$;

drop trigger if exists xp_events_sync_stell on public.xp_events;
create trigger xp_events_sync_stell
after insert or delete on public.xp_events
for each row execute function public.sync_stell_from_xp_event();

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
  select * into active_character
  from public.characters
  where user_id = auth.uid() and is_active = true
  for update;

  if active_character.id is null then raise exception 'Active character not found'; end if;

  select * into target_item
  from public.shop_items
  where id = shop_item_id_input
    and is_active = true
    and is_basic = false
    and unlock_method = 'gem'
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now());

  if target_item.id is null then raise exception 'Shop item not found'; end if;
  if public.get_level_from_total_xp(active_character.xp_total) < target_item.required_level then
    raise exception 'Required level not reached';
  end if;
  if active_character.stell_balance < target_item.cost then raise exception 'Not enough Stell'; end if;

  if not exists (
    select 1 from public.shop_item_variants
    where shop_item_id = target_item.id and species = active_character.species
  ) and target_item.species is distinct from active_character.species then
    raise exception 'This item is not available for the active character species';
  end if;

  if exists (
    select 1 from public.character_inventory
    where character_id = active_character.id and shop_item_id = target_item.id
  ) then raise exception 'Item already purchased'; end if;

  update public.characters
  set stell_balance = stell_balance - target_item.cost
  where id = active_character.id;

  insert into public.character_inventory (character_id, shop_item_id)
  values (active_character.id, target_item.id)
  returning * into purchased_item;

  return purchased_item;
end;
$$;

create or replace function public.claim_unlocked_shop_item(shop_item_id_input uuid)
returns public.character_inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  active_character public.characters;
  target_item public.shop_items;
  attendance_days integer;
  focus_minutes integer;
  claimed_item public.character_inventory;
begin
  select * into active_character
  from public.characters
  where user_id = auth.uid() and is_active = true
  for update;

  if active_character.id is null then raise exception 'Active character not found'; end if;

  select * into target_item
  from public.shop_items
  where id = shop_item_id_input
    and is_active = true
    and is_basic = false
    and unlock_method in ('attendance', 'focus')
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now());

  if target_item.id is null then raise exception 'Claimable item not found'; end if;

  select count(*) into attendance_days
  from public.user_attendance where user_id = auth.uid();

  select coalesce(floor(sum(seconds) / 60.0), 0)::integer into focus_minutes
  from public.focus_window_logs where user_id = auth.uid();

  if target_item.unlock_method = 'attendance' and attendance_days < target_item.unlock_requirement then
    raise exception 'Attendance requirement not reached';
  end if;
  if target_item.unlock_method = 'focus' and focus_minutes < target_item.unlock_requirement then
    raise exception 'Focus requirement not reached';
  end if;

  if not exists (
    select 1 from public.shop_item_variants
    where shop_item_id = target_item.id and species = active_character.species
  ) and target_item.species is distinct from active_character.species then
    raise exception 'This item is not available for the active character species';
  end if;

  insert into public.character_inventory (character_id, shop_item_id)
  values (active_character.id, target_item.id)
  on conflict (character_id, shop_item_id) do update
  set purchased_at = character_inventory.purchased_at
  returning * into claimed_item;

  return claimed_item;
end;
$$;
