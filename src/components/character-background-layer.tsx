import { getCharacterBackground } from "@/lib/character-backgrounds";

type CharacterBackgroundLayerProps = {
  customization?: Record<string, string>;
};

export function CharacterBackgroundLayer({ customization }: CharacterBackgroundLayerProps) {
  const background = getCharacterBackground(customization);

  if (background.id === "none") {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="avatar-background-layer"
      style={{
        backgroundColor: background.color,
        backgroundImage: background.imageUrl ? `url("${background.imageUrl}")` : undefined
      }}
    />
  );
}
