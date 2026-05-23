create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.undo_complete_todo(todo_id_input uuid)
returns public.todos
language plpgsql
security definer
set search_path = public
as $$
declare
  target_todo public.todos;
  awarded_event public.xp_events;
  updated_todo public.todos;
begin
  select *
  into target_todo
  from public.todos
  where id = todo_id_input
    and user_id = auth.uid()
  for update;

  if target_todo.id is null then
    raise exception 'Todo not found';
  end if;

  if target_todo.status <> 'completed' then
    raise exception 'Todo is not completed';
  end if;

  select *
  into awarded_event
  from public.xp_events
  where todo_id = target_todo.id
    and user_id = auth.uid()
  for update;

  if awarded_event.id is null then
    raise exception 'XP event not found';
  end if;

  update public.characters
  set
    xp_total = greatest(xp_total - awarded_event.amount, 0),
    xp_current = greatest(xp_current - awarded_event.amount, 0)
  where id = awarded_event.character_id
    and user_id = auth.uid();

  delete from public.xp_events
  where id = awarded_event.id;

  update public.todos
  set
    status = 'open',
    completed_at = null,
    assigned_character_id = null,
    version = version + 1
  where id = target_todo.id
  returning * into updated_todo;

  return updated_todo;
end;
$$;
