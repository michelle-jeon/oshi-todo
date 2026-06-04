import type { Character } from "@/types/domain";

export const DEFAULT_TODO_XP = 10;
export const DAILY_XP_CAP = 500;
export const DEFAULT_XP_DIFFICULTY = "medium";
export const XP_DIFFICULTY_REWARDS = {
  low: 5,
  medium: 20,
  high: 50
} as const;

export type XpDifficulty = keyof typeof XP_DIFFICULTY_REWARDS;

export function isXpDifficulty(value: string): value is XpDifficulty {
  return value === "low" || value === "medium" || value === "high";
}

export function getXpRewardForDifficulty(difficulty: XpDifficulty) {
  return XP_DIFFICULTY_REWARDS[difficulty];
}

export const LEVEL_THRESHOLDS = [
  0, 50, 120, 220, 360, 540, 760, 1020, 1320, 1660, 2040
] as const;

export const STARTER_CHARACTER: Character = {
  id: "starter",
  displayName: "첫 번째 친구",
  species: "human",
  level: 1,
  xpCurrent: 0,
  xpTotal: 0,
  customization: {
    species: "human",
    hairColor: "#5f3d2e",
    outfitColor: "#4f7cff"
  }
};

export const SPECIES_OPTIONS = [
  { value: "human", label: "인간" },
  { value: "cat", label: "고양이" }
] as const;
