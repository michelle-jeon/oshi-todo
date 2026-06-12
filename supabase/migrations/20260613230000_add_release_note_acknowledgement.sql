alter table public.profiles
add column if not exists last_seen_release_version text;
