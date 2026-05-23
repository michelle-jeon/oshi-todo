"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const variants = [
  {
    id: "blue",
    label: "블루",
    color: "#4f7cff",
    human: "/assets/characters/human-outfit-blue.png",
    cat: "/assets/characters/cat-pattern-blue.png"
  },
  {
    id: "mint",
    label: "민트",
    color: "#2f9f8f",
    human: "/assets/characters/human-outfit-mint.png",
    cat: "/assets/characters/cat-pattern-mint.png"
  },
  {
    id: "coral",
    label: "코랄",
    color: "#d85f45",
    human: "/assets/characters/human-outfit-coral.png",
    cat: "/assets/characters/cat-pattern-coral.png"
  },
  {
    id: "gold",
    label: "골드",
    color: "#d8a333",
    human: "/assets/characters/human-outfit-gold.png",
    cat: "/assets/characters/cat-pattern-gold.png"
  },
  {
    id: "violet",
    label: "바이올렛",
    color: "#7b5cd6",
    human: "/assets/characters/human-outfit-violet.png",
    cat: "/assets/characters/cat-pattern-violet.png"
  }
] as const;

type Species = "human" | "cat";

type CharacterShowcaseProps = {
  initialSpecies?: Species;
};

export function CharacterShowcase({ initialSpecies = "human" }: CharacterShowcaseProps) {
  const [species, setSpecies] = useState<Species>(initialSpecies);
  const [variantId, setVariantId] = useState<(typeof variants)[number]["id"]>("blue");

  const activeVariant = useMemo(
    () => variants.find((variant) => variant.id === variantId) ?? variants[0],
    [variantId]
  );

  return (
    <>
      <div className="avatar-stage" aria-label="캐릭터 미리보기">
        <Image
          priority
          className="avatar-image"
          src={activeVariant[species]}
          alt={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${activeVariant.label} 색상`}
          width={512}
          height={512}
        />
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <h3>캐릭터</h3>
        <div className="segmented-control" aria-label="캐릭터 종류">
          <button
            className={species === "human" ? "selected" : ""}
            type="button"
            onClick={() => setSpecies("human")}
          >
            인간
          </button>
          <button
            className={species === "cat" ? "selected" : ""}
            type="button"
            onClick={() => setSpecies("cat")}
          >
            고양이
          </button>
        </div>

        <h3>색상</h3>
        <div className="swatches">
          {variants.map((variant) => (
            <button
              key={variant.id}
              className={`swatch ${variant.id === variantId ? "selected" : ""}`}
              style={{ background: variant.color }}
              type="button"
              onClick={() => setVariantId(variant.id)}
              aria-label={`${variant.label} 색상 선택`}
            />
          ))}
        </div>
      </section>
    </>
  );
}
