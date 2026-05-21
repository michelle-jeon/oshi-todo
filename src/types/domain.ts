export type Species = "human" | "cat";

export type CharacterPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

export type HumanCustomization = {
  species: "human";
  hairColor: string;
  outfitColor: string;
};

export type CatCustomization = {
  species: "cat";
  furColor: string;
  patternColor: string;
};

export type CharacterCustomization = HumanCustomization | CatCustomization;

export type Character = {
  id: string;
  displayName: string;
  species: Species;
  level: number;
  xpCurrent: number;
  xpTotal: number;
  customization: CharacterCustomization;
};

export type Todo = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  xpReward: number;
  completedAt: string | null;
};

export type ShopItemSlot =
  | "human_hair"
  | "human_outfit"
  | "cat_pattern"
  | "accessory"
  | "room_item"
  | "mount";

export type RoomCustomization = {
  wallpaper?: string;
  floor?: string;
  furnitureIds: string[];
};
