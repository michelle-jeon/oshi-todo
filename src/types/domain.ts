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
  bodyId?: string;
  shoesId?: string;
  bottomId?: string;
  topId?: string;
  hairId?: string;
  mouthId?: string;
  eyeId?: string;
  accessoryId?: string;
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
  | "human_body"
  | "human_shoes"
  | "human_bottom"
  | "human_top"
  | "human_hair"
  | "human_mouth"
  | "human_eyes"
  | "human_outfit"
  | "cat_pattern"
  | "accessory"
  | "background"
  | "room_item"
  | "mount";

export type RoomCustomization = {
  wallpaper?: string;
  floor?: string;
  furnitureIds: string[];
};
