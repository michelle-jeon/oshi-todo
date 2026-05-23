alter type public.inventory_item_slot add value if not exists 'human_eyes';
alter type public.inventory_item_slot add value if not exists 'cat_eyes';

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
    and is_active = true;

  if target_item.id is null then
    raise exception 'Shop item not found';
  end if;

  if target_item.species is not null and target_item.species <> active_character.species then
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
  safe_amount = least(greatest(amount_input, 1), 10);

  select *
  into active_character
  from public.characters
  where user_id = auth.uid()
    and is_active = true
  for update;

  if active_character.id is null then
    raise exception 'Active character not found';
  end if;

  update public.characters
  set
    xp_total = xp_total + safe_amount,
    xp_current = xp_current + safe_amount
  where id = active_character.id;

  insert into public.xp_events (user_id, character_id, amount, reason)
  values (auth.uid(), active_character.id, safe_amount, 'focus_window')
  returning * into created_event;

  return created_event;
end;
$$;
