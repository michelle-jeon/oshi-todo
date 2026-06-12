/* eslint-disable @next/next/no-img-element */

import { getCharacterAsset, type CharacterSpecies } from "@/lib/character-assets";
import { CharacterBackgroundLayer } from "@/components/character-background-layer";

type CharacterShowcaseProps = {
  species: CharacterSpecies;
  variantId?: string;
  customization?: Record<string, string>;
  showBackground?: boolean;
};

export function CharacterShowcase({
  species,
  variantId,
  customization,
  showBackground = false
}: CharacterShowcaseProps) {
  const asset = getCharacterAsset(species, customization ?? variantId);
  return (
    <div className="avatar-stage" aria-label="캐릭터 미리보기">
      {asset.layers ? (
        <div
          className="avatar-layer-stack"
          aria-label={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label} 색상`}
        >
          {showBackground ? <CharacterBackgroundLayer customization={customization} /> : null}
          {asset.layers.map((layer) => (
            <img
              className="avatar-layer"
              key={layer.id}
              src={layer.src}
              alt={layer.alt}
            />
          ))}
        </div>
      ) : (
        <div className="avatar-layer-stack">
          {showBackground ? <CharacterBackgroundLayer customization={customization} /> : null}
          <img
            className="avatar-layer"
            src={asset.src}
            alt={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label} 색상`}
          />
        </div>
      )}
    </div>
  );
}
