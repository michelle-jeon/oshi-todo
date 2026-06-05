-- 10단계: XP/재화 기록 커서 페이지네이션에 필요한 정렬 인덱스를 준비합니다.
-- 기존 02_query_indexes.sql을 실행한 뒤 추가로 실행해도 되고, 여러 번 실행해도 안전합니다.

create index if not exists xp_events_user_created_id_idx
on public.xp_events(user_id, created_at desc, id desc);

create index if not exists character_inventory_character_purchased_item_idx
on public.character_inventory(character_id, purchased_at desc, shop_item_id desc);

select '10_xp_ledger_cursor_indexes 완료' as status;
