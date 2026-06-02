alter table public.routines
add column if not exists ends_on date;

create index if not exists routines_user_schedule_idx
on public.routines(user_id, starts_on, ends_on, is_active);

create index if not exists todos_user_date_sort_idx
on public.todos(user_id, todo_date, sort_order desc);
