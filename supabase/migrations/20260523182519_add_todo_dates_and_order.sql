alter table public.todos
add column if not exists todo_date date not null default current_date,
add column if not exists sort_order integer not null default 0;

create index if not exists todos_user_date_order_idx
on public.todos(user_id, todo_date, status, sort_order, created_at);

update public.todos
set sort_order = extract(epoch from created_at)::integer
where sort_order = 0;
