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
