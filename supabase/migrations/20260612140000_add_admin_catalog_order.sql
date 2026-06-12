alter table public.shop_items
add column if not exists sort_order integer not null default 0;

with ordered_items as (
  select id, row_number() over (order by created_at, id) * 10 as next_sort_order
  from public.shop_items
)
update public.shop_items
set sort_order = ordered_items.next_sort_order
from ordered_items
where shop_items.id = ordered_items.id
  and shop_items.sort_order = 0;

create index if not exists shop_items_sort_order_idx
on public.shop_items(sort_order, created_at);

drop policy if exists "admins can view characters" on public.characters;
create policy "admins can view characters"
on public.characters for select
using (public.is_admin());

drop policy if exists "admins can view character inventory" on public.character_inventory;
create policy "admins can view character inventory"
on public.character_inventory for select
using (public.is_admin());
