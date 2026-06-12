alter table public.profiles
add column if not exists last_seen_at timestamptz not null default now();

create or replace function public.touch_user_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid()
    and last_seen_at < now() - interval '1 minute';
end;
$$;

revoke execute on function public.touch_user_presence() from public;
grant execute on function public.touch_user_presence() to authenticated;

drop policy if exists "authenticated can view active characters" on public.characters;
create policy "authenticated can view active characters"
on public.characters for select
using (auth.uid() is not null and is_active = true);
