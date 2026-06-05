-- 11단계: 투두 마감일 컬럼과 조회 인덱스를 준비합니다.
-- 여러 번 실행해도 안전합니다.

alter table public.todos
add column if not exists due_date date;

create index if not exists todos_user_due_date_idx
on public.todos(user_id, due_date, status, sort_order)
where due_date is not null;

select '11_todo_due_dates 완료' as status;
