import Image from "next/image";
import { getCharacterAsset, type CharacterSpecies } from "@/lib/character-assets";

type CharacterShowcaseProps = {
  species: CharacterSpecies;
  variantId?: string;
};

export function CharacterShowcase({ species, variantId }: CharacterShowcaseProps) {
  const asset = getCharacterAsset(species, variantId);

  return (
    <div className="avatar-stage" aria-label="캐릭터 미리보기">
      <Image
        priority
        className="avatar-image"
        src={asset.src}
        alt={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label} 색상`}
        width={512}
        height={512}
      />
    </div>
  );
}
