insert into public.shop_items (code, name, slot, species, cost, payload)
values
  ('human_eyes_bright', '반짝 눈', 'human_eyes', 'human', 60, '{"eyeId":"bright"}'),
  ('human_eyes_calm', '차분한 눈', 'human_eyes', 'human', 60, '{"eyeId":"calm"}'),
  ('human_accessory_ribbon', '하트 리본', 'accessory', 'human', 110, '{"accessoryId":"ribbon"}'),
  ('cat_eyes_bright', '고양이 반짝 눈', 'cat_eyes', 'cat', 60, '{"eyeId":"bright"}'),
  ('cat_eyes_calm', '고양이 차분한 눈', 'cat_eyes', 'cat', 60, '{"eyeId":"calm"}'),
  ('cat_accessory_star_pin', '별 목걸이', 'accessory', 'cat', 110, '{"accessoryId":"star-pin"}')
on conflict (code) do nothing;
