-- '없음'은 구매·관리 상품이 아니라 생성·옷장의 로컬 해제 상태로만 사용한다.
-- 같은 내용의 migration: 20260613223000_remove_none_catalog_items.sql

delete from public.shop_item_variants
where shop_item_id in (
  select id
  from public.shop_items
  where code in (
    'basic_human_shoes_none',
    'basic_human_bottom_none',
    'basic_human_top_none',
    'basic_human_hair_none',
    'basic_human_accessory_none',
    'basic_cat_accessory_none',
    'basic_background_none'
  )
);

delete from public.shop_items
where code in (
  'basic_human_shoes_none',
  'basic_human_bottom_none',
  'basic_human_top_none',
  'basic_human_hair_none',
  'basic_human_accessory_none',
  'basic_cat_accessory_none',
  'basic_background_none'
);
