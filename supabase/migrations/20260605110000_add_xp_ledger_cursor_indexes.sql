do $$
begin
  if to_regclass('public.xp_events') is not null then
    create index if not exists xp_events_user_created_id_idx
    on public.xp_events(user_id, created_at desc, id desc);
  end if;

  if to_regclass('public.character_inventory') is not null then
    create index if not exists character_inventory_character_purchased_item_idx
    on public.character_inventory(character_id, purchased_at desc, shop_item_id desc);
  end if;
end $$;
