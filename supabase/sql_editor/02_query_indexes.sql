-- 2단계: 자주 조회하는 경로에 필요한 인덱스를 준비합니다.
-- 1단계가 성공한 뒤 Supabase SQL Editor의 새 쿼리 창에서 실행하세요.

create index if not exists focus_window_logs_user_date_updated_idx
on public.focus_window_logs(user_id, work_date desc, updated_at desc);

create index if not exists xp_events_user_created_idx
on public.xp_events(user_id, created_at desc);

create index if not exists character_inventory_purchased_idx
on public.character_inventory(character_id, purchased_at desc);

create index if not exists shop_items_active_species_slot_cost_idx
on public.shop_items(is_active, species, slot, cost);

create index if not exists friendships_following_idx
on public.friendships(following_id, follower_id);

create index if not exists plaza_rooms_owner_created_idx
on public.plaza_rooms(owner_id, created_at desc);

select '02_query_indexes 완료' as status;
