-- 사용자가 마지막으로 확인한 운영 릴리스 노트 버전을 저장한다.
-- 같은 내용의 migration: 20260613230000_add_release_note_acknowledgement.sql

alter table public.profiles
add column if not exists last_seen_release_version text;
