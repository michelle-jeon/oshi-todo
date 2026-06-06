/* eslint-disable @next/next/no-img-element */

import { getCharacterAsset, type CharacterSpecies } from "@/lib/character-assets";

type CharacterShowcaseProps = {
  species: CharacterSpecies;
  variantId?: string;
  customization?: Record<string, string>;
};

export function CharacterShowcase({ species, variantId, customization }: CharacterShowcaseProps) {
  const asset = getCharacterAsset(species, customization ?? variantId);

  return (
    <div className="avatar-stage" aria-label="캐릭터 미리보기">
      {asset.layers ? (
        <div
          className="avatar-layer-stack"
          aria-label={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label} 색상`}
        >
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
        <img
          className="avatar-image"
          src={asset.src}
          alt={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label} 색상`}
        />
      )}
    </div>
  );
}
