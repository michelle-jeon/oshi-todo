alter table public.todos
add column if not exists due_date date;

create index if not exists todos_user_due_date_idx
on public.todos(user_id, due_date, status, sort_order)
where due_date is not null;
