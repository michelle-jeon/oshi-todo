alter table public.shop_items
add column if not exists is_system boolean not null default false;

update public.shop_items
set is_system = true
where code like 'basic_human_%'
   or code like 'basic_cat_%';

create index if not exists shop_items_system_idx
on public.shop_items(is_system, is_basic, sort_order);

create table if not exists public.user_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attended_on date not null default (timezone('Asia/Seoul', now()))::date,
  created_at timestamptz not null default now(),
  unique (user_id, attended_on)
);

alter table public.user_attendance enable row level security;

drop policy if exists "users view own attendance" on public.user_attendance;
create policy "users view own attendance"
on public.user_attendance for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users record own attendance" on public.user_attendance;
create policy "users record own attendance"
on public.user_attendance for insert
with check (user_id = auth.uid());

create index if not exists user_attendance_user_date_idx
on public.user_attendance(user_id, attended_on desc);

create or replace function public.record_daily_attendance(
  attended_on_input date default (timezone('Asia/Seoul', now()))::date
)
returns public.user_attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  attendance public.user_attendance;
begin
  insert into public.user_attendance (user_id, attended_on)
  values (auth.uid(), attended_on_input)
  on conflict (user_id, attended_on)
  do update set attended_on = excluded.attended_on
  returning * into attendance;

  return attendance;
end;
$$;
