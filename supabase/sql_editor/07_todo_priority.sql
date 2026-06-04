alter table public.todos
add column if not exists priority text not null default 'normal';

alter table public.todos
drop constraint if exists todos_priority_check;

alter table public.todos
add constraint todos_priority_check
check (priority in ('low', 'normal', 'high'));

create index if not exists todos_user_date_priority_idx
on public.todos(user_id, todo_date, priority, status, sort_order);
