export const CHARACTER_BACKGROUND_OPTIONS = [
  { id: "none", label: "없음", color: "transparent" },
  { id: "cream", label: "크림", color: "#fff8eb" },
  { id: "mint", label: "민트", color: "#e9f5f1" },
  { id: "sky", label: "하늘", color: "#eaf2ff" },
  { id: "pink", label: "분홍", color: "#fff0f3" },
  { id: "lavender", label: "라벤더", color: "#f1edff" },
  { id: "gray", label: "회색", color: "#f1f0ed" },
  { id: "black", label: "블랙", color: "#2e2e2e" },
  { id: "white", label: "화이트", color: "#fcfcfc" }
] as const;

export type CharacterBackgroundItem = {
  id: string;
  label: string;
  color: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isBasic: boolean;
  payload?: Record<string, string>;
};

export const BASIC_CHARACTER_BACKGROUNDS: CharacterBackgroundItem[] =
  CHARACTER_BACKGROUND_OPTIONS.map((option) => ({
    ...option,
    thumbnailUrl: option.id === "none" ? "/assets/ui/costume-none.png" : undefined,
    isBasic: true
  }));

export const DEFAULT_CHARACTER_BACKGROUND = BASIC_CHARACTER_BACKGROUNDS[1];

export function getBackgroundPayload(item: CharacterBackgroundItem) {
  return item.payload ?? {
    backgroundId: item.id,
    backgroundColor: item.color,
    backgroundImageUrl: item.imageUrl ?? ""
  };
}

export function getCharacterBackground(customization?: Record<string, string>) {
  const backgroundId = customization?.backgroundId;
  const backgroundColor = customization?.backgroundColor;
  const basic = BASIC_CHARACTER_BACKGROUNDS.find(
    (item) => item.id === backgroundId || item.color === backgroundColor
  );

  return {
    id: backgroundId ?? basic?.id ?? DEFAULT_CHARACTER_BACKGROUND.id,
    color: backgroundColor ?? basic?.color ?? DEFAULT_CHARACTER_BACKGROUND.color,
    imageUrl: customization?.backgroundImageUrl ?? ""
  };
}
