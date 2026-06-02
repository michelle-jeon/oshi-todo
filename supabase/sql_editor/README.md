# Supabase SQL Editor 실행 순서

SQL Editor에는 파일 경로가 아니라 파일 내용을 붙여넣어야 한다.

아래 파일을 번호 순서대로 열고, 각각 새 쿼리 창에 내용 전체를 붙여넣어 실행한다.

1. `01_focus_logs_schema.sql`
2. `02_query_indexes.sql`
3. `03_demo_focus_logs.sql`
4. `04_routine_end_and_indexes.sql`

각 단계가 성공하면 `완료` 상태 메시지가 나온다.

`unterminated dollar-quoted string` 오류가 나면 함수 SQL이 중간에서 잘린 것이다. 새 쿼리 창을 열고 해당 단계 파일 내용을 처음부터 끝까지 다시 붙여넣어 실행한다.
