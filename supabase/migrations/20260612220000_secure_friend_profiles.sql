drop policy if exists "authenticated can view active characters" on public.characters;

create or replace function public.get_friend_active_characters(user_ids_input uuid[])
returns table (
  user_id uuid,
  display_name text,
  species public.character_species,
  level integer,
  customization jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    characters.user_id,
    characters.display_name,
    characters.species,
    characters.level,
    characters.customization
  from public.characters
  where characters.is_active = true
    and characters.user_id = any(user_ids_input)
    and exists (
      select 1
      from public.friendships
      where (
        friendships.follower_id = auth.uid()
        and friendships.following_id = characters.user_id
      ) or (
        friendships.following_id = auth.uid()
        and friendships.follower_id = characters.user_id
      )
    );
$$;

revoke execute on function public.get_friend_active_characters(uuid[]) from public;
grant execute on function public.get_friend_active_characters(uuid[]) to authenticated;

