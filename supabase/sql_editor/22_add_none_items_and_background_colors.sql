-- 몸, 눈, 입을 제외한 선택형 코스튬의 '없음' 상태와 추가 배경색을 등록한다.
-- 같은 내용의 migration: 20260613220000_add_none_items_and_background_colors.sql

with optional_items (code, name, slot, species, payload, thumbnail_url, sort_order) as (
  values
    ('basic_human_shoes_none', '신발 없음', 'human_shoes'::public.inventory_item_slot, 'human'::public.character_species, '{"shoesId":"none","shoesAssetUrl":""}'::jsonb, '/assets/ui/costume-none.png', 1),
    ('basic_human_bottom_none', '하의 없음', 'human_bottom'::public.inventory_item_slot, 'human'::public.character_species, '{"bottomId":"none","bottomAssetUrl":""}'::jsonb, '/assets/ui/costume-none.png', 1),
    ('basic_human_top_none', '상의 없음', 'human_top'::public.inventory_item_slot, 'human'::public.character_species, '{"topId":"none","topAssetUrl":""}'::jsonb, '/assets/ui/costume-none.png', 1),
    ('basic_human_hair_none', '헤어 없음', 'human_hair'::public.inventory_item_slot, 'human'::public.character_species, '{"hairId":"none","hairAssetUrl":""}'::jsonb, '/assets/ui/costume-none.png', 1),
    ('basic_human_accessory_none', '악세서리 없음', 'accessory'::public.inventory_item_slot, 'human'::public.character_species, '{"accessoryId":"none","accessoryAssetUrl":""}'::jsonb, '/assets/ui/costume-none.png', 1),
    ('basic_cat_accessory_none', '고양이 악세서리 없음', 'accessory'::public.inventory_item_slot, 'cat'::public.character_species, '{"accessoryId":"none"}'::jsonb, '/assets/ui/costume-none.png', 1)
),
upserted as (
  insert into public.shop_items (
    code, name, slot, species, cost, payload, thumbnail_url, is_active, is_basic, is_system,
    unlock_method, unlock_requirement, required_level, sort_order
  )
  select code, name, slot, species, 0, payload, thumbnail_url, true, true, true, 'gem', 0, 1, sort_order
  from optional_items
  on conflict (code) do update set
    name = excluded.name, slot = excluded.slot, species = excluded.species, cost = 0,
    payload = excluded.payload, thumbnail_url = excluded.thumbnail_url, is_active = true,
    is_basic = true, is_system = true, sort_order = excluded.sort_order
  returning id, code
)
insert into public.shop_item_variants (shop_item_id, species, slot, payload, layer_asset_url)
select upserted.id, optional_items.species, optional_items.slot, optional_items.payload, null
from upserted join optional_items using (code)
on conflict (shop_item_id, species) do update set
  slot = excluded.slot, payload = excluded.payload, layer_asset_url = null;

with background_items (code, name, payload, thumbnail_url, sort_order) as (
  values
    ('basic_background_none', '배경 없음', '{"backgroundId":"none","backgroundColor":"transparent","backgroundImageUrl":""}'::jsonb, '/assets/ui/costume-none.png', 1),
    ('basic_background_black', '블랙 배경', '{"backgroundId":"black","backgroundColor":"#2e2e2e","backgroundImageUrl":""}'::jsonb, null, 460),
    ('basic_background_white', '화이트 배경', '{"backgroundId":"white","backgroundColor":"#fcfcfc","backgroundImageUrl":""}'::jsonb, null, 470)
),
upserted as (
  insert into public.shop_items (
    code, name, slot, species, cost, payload, thumbnail_url, is_active, is_basic, is_system,
    unlock_method, unlock_requirement, required_level, sort_order
  )
  select code, name, 'background'::public.inventory_item_slot, null, 0, payload, thumbnail_url, true, true, true, 'gem', 0, 1, sort_order
  from background_items
  on conflict (code) do update set
    name = excluded.name, slot = excluded.slot, species = null, cost = 0,
    payload = excluded.payload, thumbnail_url = excluded.thumbnail_url, is_active = true,
    is_basic = true, is_system = true, sort_order = excluded.sort_order
  returning id, code
)
insert into public.shop_item_variants (shop_item_id, species, slot, payload, layer_asset_url)
select upserted.id, species, 'background'::public.inventory_item_slot, background_items.payload, null
from upserted
join background_items using (code)
cross join (values ('human'::public.character_species), ('cat'::public.character_species)) species(species)
on conflict (shop_item_id, species) do update set
  slot = excluded.slot, payload = excluded.payload, layer_asset_url = null;
