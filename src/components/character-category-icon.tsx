import {
  Accessibility,
  BetweenHorizontalEnd,
  Eye,
  Footprints,
  Gem,
  Scissors,
  Shirt,
  Smile
} from "lucide-react";
import type { HumanLayerCategory } from "@/lib/character-assets";

const categoryIcons = {
  body: Accessibility,
  shoes: Footprints,
  bottom: BetweenHorizontalEnd,
  top: Shirt,
  hair: Scissors,
  mouth: Smile,
  eyes: Eye,
  accessory: Gem
} satisfies Record<HumanLayerCategory, typeof Accessibility>;

export function CharacterCategoryIcon({
  category,
  size = 20
}: {
  category: HumanLayerCategory;
  size?: number;
}) {
  const Icon = categoryIcons[category];

  return <Icon size={size} />;
}
