export type CharacterOnboardingShape = {
  display_name: string;
  customization: Record<string, string> | null;
};

export const MAX_CHARACTER_SLOTS = 6;

export function isCharacterOnboardingComplete(character: CharacterOnboardingShape | null) {
  if (!character) {
    return false;
  }

  const customization = character.customization ?? {};

  return Boolean(character.display_name.trim()) && Boolean(customization.variantId);
}

export function isLegacyStarterCharacter(character: CharacterOnboardingShape | null) {
  if (!character) {
    return false;
  }

  return character.display_name === "첫 번째 친구" || !character.customization?.variantId;
}
