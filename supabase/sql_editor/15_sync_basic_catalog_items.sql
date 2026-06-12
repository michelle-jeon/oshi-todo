alter table public.shop_items
add column if not exists is_basic boolean not null default false;

create index if not exists shop_items_basic_sort_idx
on public.shop_items(is_basic, sort_order, created_at);

with basic_items (code, name, slot, species, payload, layer_asset_url, sort_order) as (
  values
    ('basic_human_basic_17', '기본형 바디 17호', 'human_body'::public.inventory_item_slot, 'human'::public.character_species, '{"bodyId":"basic-17","bodyAssetUrl":""}'::jsonb, '/assets/characters/human/layers/body/basic-17.png', 100),
    ('basic_human_sneakers_black', '운동화 · 블랙', 'human_shoes'::public.inventory_item_slot, 'human'::public.character_species, '{"shoesId":"sneakers-black","shoesAssetUrl":""}'::jsonb, '/assets/characters/human/layers/shoes/sneakers-black.png', 110),
    ('basic_human_straight_pants_ivory', '긴 면바지 · 아이보리', 'human_bottom'::public.inventory_item_slot, 'human'::public.character_species, '{"bottomId":"straight-pants-ivory","bottomAssetUrl":""}'::jsonb, '/assets/characters/human/layers/bottom/straight-pants-ivory.png', 120),
    ('basic_human_straight_pants_black', '긴 면바지 · 블랙', 'human_bottom'::public.inventory_item_slot, 'human'::public.character_species, '{"bottomId":"straight-pants-black","bottomAssetUrl":""}'::jsonb, '/assets/characters/human/layers/bottom/straight-pants-black.png', 130),
    ('basic_human_short_sleeve_shirt_mint', '반소매 티셔츠 · 민트', 'human_top'::public.inventory_item_slot, 'human'::public.character_species, '{"topId":"short-sleeve-shirt-mint","topAssetUrl":""}'::jsonb, '/assets/characters/human/layers/top/short-sleeve-shirt-mint.png', 140),
    ('basic_human_short_sleeve_shirt_violet', '반소매 티셔츠 · 바이올렛', 'human_top'::public.inventory_item_slot, 'human'::public.character_species, '{"topId":"short-sleeve-shirt-violet","topAssetUrl":""}'::jsonb, '/assets/characters/human/layers/top/short-sleeve-shirt-violet.png', 150),
    ('basic_human_short_sleeve_shirt_blue', '반소매 티셔츠 · 블루', 'human_top'::public.inventory_item_slot, 'human'::public.character_species, '{"topId":"short-sleeve-shirt-blue","topAssetUrl":""}'::jsonb, '/assets/characters/human/layers/top/short-sleeve-shirt-blue.png', 160),
    ('basic_human_short_sleeve_shirt_yellow', '반소매 티셔츠 · 옐로', 'human_top'::public.inventory_item_slot, 'human'::public.character_species, '{"topId":"short-sleeve-shirt-yellow","topAssetUrl":""}'::jsonb, '/assets/characters/human/layers/top/short-sleeve-shirt-yellow.png', 170),
    ('basic_human_short_sleeve_shirt_coral', '반소매 티셔츠 · 코랄', 'human_top'::public.inventory_item_slot, 'human'::public.character_species, '{"topId":"short-sleeve-shirt-coral","topAssetUrl":""}'::jsonb, '/assets/characters/human/layers/top/short-sleeve-shirt-coral.png', 180),
    ('basic_human_tousled_gray', '더벅머리 · 그레이', 'human_hair'::public.inventory_item_slot, 'human'::public.character_species, '{"hairId":"tousled-gray","hairAssetUrl":""}'::jsonb, '/assets/characters/human/layers/hair/tousled-gray.png', 190),
    ('basic_human_tousled_red', '더벅머리 · 레드', 'human_hair'::public.inventory_item_slot, 'human'::public.character_species, '{"hairId":"tousled-red","hairAssetUrl":""}'::jsonb, '/assets/characters/human/layers/hair/tousled-red.png', 200),
    ('basic_human_tousled_brown', '더벅머리 · 브라운', 'human_hair'::public.inventory_item_slot, 'human'::public.character_species, '{"hairId":"tousled-brown","hairAssetUrl":""}'::jsonb, '/assets/characters/human/layers/hair/tousled-brown.png', 210),
    ('basic_human_tousled_yellow', '더벅머리 · 옐로', 'human_hair'::public.inventory_item_slot, 'human'::public.character_species, '{"hairId":"tousled-yellow","hairAssetUrl":""}'::jsonb, '/assets/characters/human/layers/hair/tousled-yellow.png', 220),
    ('basic_human_smile', '웃는 입', 'human_mouth'::public.inventory_item_slot, 'human'::public.character_species, '{"mouthId":"smile","mouthAssetUrl":""}'::jsonb, '/assets/characters/human/layers/mouth/smile.png', 230),
    ('basic_human_long_green', '길쭉 눈 · 그린', 'human_eyes'::public.inventory_item_slot, 'human'::public.character_species, '{"eyeId":"long-green","eyeAssetUrl":""}'::jsonb, '/assets/characters/human/layers/eyes/long-green.png', 240),
    ('basic_human_long_red_brown', '길쭉 눈 · 레드브라운', 'human_eyes'::public.inventory_item_slot, 'human'::public.character_species, '{"eyeId":"long-red-brown","eyeAssetUrl":""}'::jsonb, '/assets/characters/human/layers/eyes/long-red-brown.png', 250),
    ('basic_human_long_black', '길쭉 눈 · 블랙', 'human_eyes'::public.inventory_item_slot, 'human'::public.character_species, '{"eyeId":"long-black","eyeAssetUrl":""}'::jsonb, '/assets/characters/human/layers/eyes/long-black.png', 260),
    ('basic_human_long_blue', '길쭉 눈 · 블루', 'human_eyes'::public.inventory_item_slot, 'human'::public.character_species, '{"eyeId":"long-blue","eyeAssetUrl":""}'::jsonb, '/assets/characters/human/layers/eyes/long-blue.png', 270),
    ('basic_human_accessory_none', '악세서리 없음', 'accessory'::public.inventory_item_slot, 'human'::public.character_species, '{"accessoryId":"none","accessoryAssetUrl":""}'::jsonb, null, 280),
    ('basic_cat_pattern_blue', '고양이 패턴 · 블루', 'cat_pattern'::public.inventory_item_slot, 'cat'::public.character_species, '{"variantId":"blue"}'::jsonb, '/assets/characters/cat-pattern-blue.png', 290),
    ('basic_cat_pattern_mint', '고양이 패턴 · 민트', 'cat_pattern'::public.inventory_item_slot, 'cat'::public.character_species, '{"variantId":"mint"}'::jsonb, '/assets/characters/cat-pattern-mint.png', 300),
    ('basic_cat_pattern_coral', '고양이 패턴 · 코랄', 'cat_pattern'::public.inventory_item_slot, 'cat'::public.character_species, '{"variantId":"coral"}'::jsonb, '/assets/characters/cat-pattern-coral.png', 310),
    ('basic_cat_pattern_gold', '고양이 패턴 · 옐로', 'cat_pattern'::public.inventory_item_slot, 'cat'::public.character_species, '{"variantId":"gold"}'::jsonb, '/assets/characters/cat-pattern-gold.png', 320),
    ('basic_cat_pattern_violet', '고양이 패턴 · 바이올렛', 'cat_pattern'::public.inventory_item_slot, 'cat'::public.character_species, '{"variantId":"violet"}'::jsonb, '/assets/characters/cat-pattern-violet.png', 330)
),
upserted as (
  insert into public.shop_items (
    code, name, slot, species, cost, payload, is_active, is_basic,
    unlock_method, unlock_requirement, sort_order
  )
  select code, name, slot, species, 0, payload, true, true, 'gem', 0, sort_order
  from basic_items
  on conflict (code) do update set
    slot = excluded.slot,
    species = excluded.species,
    cost = 0,
    payload = excluded.payload,
    is_basic = true,
    unlock_method = 'gem',
    unlock_requirement = 0
  returning id, code
)
insert into public.shop_item_variants (
  shop_item_id, species, slot, payload, layer_asset_url
)
select upserted.id, basic_items.species, basic_items.slot, basic_items.payload, basic_items.layer_asset_url
from upserted
join basic_items using (code)
on conflict (shop_item_id, species) do update set
  slot = excluded.slot,
  payload = excluded.payload,
  layer_asset_url = excluded.layer_asset_url;

create or replace function public.purchase_shop_item(shop_item_id_input uuid)
returns public.character_inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  active_character public.characters;
  target_item public.shop_items;
  purchased_item public.character_inventory;
begin
  select * into active_character
  from public.characters
  where user_id = auth.uid() and is_active = true
  for update;

  if active_character.id is null then
    raise exception 'Active character not found';
  end if;

  select * into target_item
  from public.shop_items
  where id = shop_item_id_input
    and is_active = true
    and is_basic = false
    and unlock_method = 'gem'
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now());

  if target_item.id is null then
    raise exception 'Shop item not found';
  end if;

  if not exists (
    select 1 from public.shop_item_variants
    where shop_item_id = target_item.id and species = active_character.species
  ) and target_item.species is distinct from active_character.species then
    raise exception 'This item is not available for the active character species';
  end if;

  if active_character.xp_current < target_item.cost then
    raise exception 'Not enough XP';
  end if;

  if exists (
    select 1 from public.character_inventory
    where character_id = active_character.id and shop_item_id = target_item.id
  ) then
    raise exception 'Item already purchased';
  end if;

  update public.characters
  set xp_current = xp_current - target_item.cost
  where id = active_character.id;

  insert into public.character_inventory (character_id, shop_item_id)
  values (active_character.id, target_item.id)
  returning * into purchased_item;

  return purchased_item;
end;
$$;
