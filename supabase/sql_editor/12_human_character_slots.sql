alter type public.inventory_item_slot add value if not exists 'human_body';
alter type public.inventory_item_slot add value if not exists 'human_shoes';
alter type public.inventory_item_slot add value if not exists 'human_bottom';
alter type public.inventory_item_slot add value if not exists 'human_top';
alter type public.inventory_item_slot add value if not exists 'human_mouth';

select '12_human_character_slots 완료' as status;
