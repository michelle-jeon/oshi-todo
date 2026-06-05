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

각 단계가 성공하면 `완료` 상태 메시지가 나온다.

`unterminated dollar-quoted string` 오류가 나면 함수 SQL이 중간에서 잘린 것이다. 새 쿼리 창을 열고 해당 단계 파일 내용을 처음부터 끝까지 다시 붙여넣어 실행한다.

`09_shop_items_seed.sql`은 상점 아이템 데이터다. 같은 코드를 다시 실행해도 `on conflict (code) do update`로 최신 값만 갱신된다.
`10_xp_ledger_cursor_indexes.sql`은 XP/재화 기록 커서 페이지네이션용 인덱스이고, `11_todo_due_dates.sql`은 투두 마감일 컬럼과 인덱스다.
