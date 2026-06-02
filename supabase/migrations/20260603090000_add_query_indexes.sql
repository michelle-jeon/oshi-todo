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
