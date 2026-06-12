export const CHARACTER_BACKGROUND_OPTIONS = [
  { id: "cream", label: "크림", color: "#fff8eb" },
  { id: "mint", label: "민트", color: "#e9f5f1" },
  { id: "sky", label: "하늘", color: "#eaf2ff" },
  { id: "pink", label: "분홍", color: "#fff0f3" },
  { id: "lavender", label: "라벤더", color: "#f1edff" },
  { id: "gray", label: "회색", color: "#f1f0ed" }
] as const;

export const DEFAULT_CHARACTER_BACKGROUND = CHARACTER_BACKGROUND_OPTIONS[0].color;

export function normalizeCharacterBackground(value?: string) {
  return CHARACTER_BACKGROUND_OPTIONS.find((option) => option.color === value)?.color ??
    DEFAULT_CHARACTER_BACKGROUND;
}
