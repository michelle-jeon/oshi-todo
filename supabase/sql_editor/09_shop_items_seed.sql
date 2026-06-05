insert into public.shop_items (code, name, slot, species, cost, payload)
values
  ('human_hair_bob_brown', '브라운 단발', 'human_hair', 'human', 80, '{"hairStyle":"bob","hairColor":"#7a4a39"}'::jsonb),
  ('human_outfit_mint_hoodie', '민트 후드', 'human_outfit', 'human', 80, '{"outfitColor":"#2f6f73"}'::jsonb),
  ('cat_pattern_cheese', '치즈 줄무늬', 'cat_pattern', 'cat', 90, '{"patternColor":"#d8a333"}'::jsonb),
  ('human_eyes_bright', '반짝 눈', 'human_eyes', 'human', 60, '{"eyeId":"bright"}'::jsonb),
  ('human_eyes_calm', '차분한 눈', 'human_eyes', 'human', 60, '{"eyeId":"calm"}'::jsonb),
  ('human_accessory_ribbon', '하트 리본', 'accessory', 'human', 110, '{"accessoryId":"ribbon"}'::jsonb),
  ('cat_eyes_bright', '고양이 반짝 눈', 'cat_eyes', 'cat', 60, '{"eyeId":"bright"}'::jsonb),
  ('cat_eyes_calm', '고양이 차분한 눈', 'cat_eyes', 'cat', 60, '{"eyeId":"calm"}'::jsonb),
  ('cat_accessory_star_pin', '별 목걸이', 'accessory', 'cat', 110, '{"accessoryId":"star-pin"}'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  slot = excluded.slot,
  species = excluded.species,
  cost = excluded.cost,
  payload = excluded.payload,
  is_active = true;
