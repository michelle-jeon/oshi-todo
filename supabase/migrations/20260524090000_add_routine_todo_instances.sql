alter table public.routines
add column if not exists starts_on date not null default current_date;

update public.routines
set starts_on = created_at::date
where starts_on is null;

alter table public.todos
add column if not exists routine_id uuid references public.routines(id) on delete set null;

create unique index if not exists todos_one_routine_instance_per_date
on public.todos(user_id, routine_id, todo_date)
where routine_id is not null;

create index if not exists routines_user_active_start_idx
on public.routines(user_id, is_active, starts_on);
