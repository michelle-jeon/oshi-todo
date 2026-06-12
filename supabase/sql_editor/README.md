# Supabase SQL Editor 실행 순서

SQL Editor에는 파일 경로가 아니라 파일 내용을 붙여넣어야 한다.

아래 파일을 번호 순서대로 열고, 각각 새 쿼리 창에 내용 전체를 붙여넣어 실행한다.

1. `01_focus_logs_schema.sql`
2. `02_query_indexes.sql`
3. `03_demo_focus_logs.sql`
4. `04_routine_end_and_indexes.sql`
5. `05_base_xp_rewards.sql`
6. `06_daily_xp_cap.sql`
7. `07_todo_priority.sql`
8. `08_xp_difficulty.sql`
9. `09_shop_items_seed.sql`
10. `10_xp_ledger_cursor_indexes.sql`
11. `11_todo_due_dates.sql`
12. `12_human_character_slots.sql`
13. `13_catalog_admin.sql`
14. `14_admin_catalog_order.sql`

각 단계가 성공하면 `완료` 상태 메시지가 나온다.

`unterminated dollar-quoted string` 오류가 나면 함수 SQL이 중간에서 잘린 것이다. 새 쿼리 창을 열고 해당 단계 파일 내용을 처음부터 끝까지 다시 붙여넣어 실행한다.

`09_shop_items_seed.sql`은 상점 아이템 데이터다. 같은 코드를 다시 실행해도 `on conflict (code) do update`로 최신 값만 갱신된다.
`10_xp_ledger_cursor_indexes.sql`은 XP/재화 기록 커서 페이지네이션용 인덱스이고, `11_todo_due_dates.sql`은 투두 마감일 컬럼과 인덱스다.
`12_human_character_slots.sql`은 인간 캐릭터의 바디, 신발, 하의, 상의, 입 상점 슬롯을 추가한다.
`13_catalog_admin.sql`은 코스튬 썸네일, 종족별 착용 변형, 판매 기간, 획득 조건, 관리자 권한과 RLS를 추가하고 기존 더미 상품을 제거한다.
`14_admin_catalog_order.sql`은 상품 노출 순서와 관리자용 사용자 캐릭터·인벤토리 조회 권한을 추가한다.
