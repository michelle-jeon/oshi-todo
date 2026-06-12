with background_items (code, name, payload, sort_order) as (
  values
    ('basic_background_cream', '크림 배경', '{"backgroundId":"cream","backgroundColor":"#fff8eb","backgroundImageUrl":""}'::jsonb, 400),
    ('basic_background_mint', '민트 배경', '{"backgroundId":"mint","backgroundColor":"#e9f5f1","backgroundImageUrl":""}'::jsonb, 410),
    ('basic_background_sky', '하늘 배경', '{"backgroundId":"sky","backgroundColor":"#eaf2ff","backgroundImageUrl":""}'::jsonb, 420),
    ('basic_background_pink', '분홍 배경', '{"backgroundId":"pink","backgroundColor":"#fff0f3","backgroundImageUrl":""}'::jsonb, 430),
    ('basic_background_lavender', '라벤더 배경', '{"backgroundId":"lavender","backgroundColor":"#f1edff","backgroundImageUrl":""}'::jsonb, 440),
    ('basic_background_gray', '회색 배경', '{"backgroundId":"gray","backgroundColor":"#f1f0ed","backgroundImageUrl":""}'::jsonb, 450)
),
upserted as (
  insert into public.shop_items (
    code, name, slot, species, cost, payload, is_active, is_basic, is_system,
    unlock_method, unlock_requirement, required_level, sort_order
  )
  select
    code, name, 'background'::public.inventory_item_slot, null, 0, payload, true, true, true,
    'gem', 0, 1, sort_order
  from background_items
  on conflict (code) do update set
    name = excluded.name,
    slot = excluded.slot,
    species = null,
    cost = 0,
    payload = excluded.payload,
    is_active = true,
    is_basic = true,
    is_system = true,
    sort_order = excluded.sort_order
  returning id, code
)
insert into public.shop_item_variants (shop_item_id, species, slot, payload, layer_asset_url)
select upserted.id, species, 'background'::public.inventory_item_slot, background_items.payload, null
from upserted
join background_items using (code)
cross join (values ('human'::public.character_species), ('cat'::public.character_species)) species(species)
on conflict (shop_item_id, species) do update set
  slot = excluded.slot,
  payload = excluded.payload,
  layer_asset_url = null;

