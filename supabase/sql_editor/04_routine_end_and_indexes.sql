-- 4단계: 루틴 종료일과 투두 생성 조회 인덱스를 준비합니다.
-- 루틴 종료 기능을 쓰기 전에 Supabase SQL Editor의 새 쿼리 창에서 실행하세요.

alter table public.routines
add column if not exists ends_on date;

create index if not exists routines_user_schedule_idx
on public.routines(user_id, starts_on, ends_on, is_active);

create index if not exists todos_user_date_sort_idx
on public.todos(user_id, todo_date, sort_order desc);

select '04_routine_end_and_indexes 완료' as status;
