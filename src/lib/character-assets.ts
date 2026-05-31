export type CharacterSpecies = "human" | "cat";

export type CharacterVariantId = "blue" | "mint" | "coral" | "gold" | "violet";

export type CharacterLayer = {
  id: string;
  src: string;
  alt: string;
};

export type CharacterAsset = {
  src: string;
  layers?: CharacterLayer[];
  label: string;
  color: string;
  variantId: CharacterVariantId;
};

const HUMAN_LAYER_BASE_PATH = "/assets/characters/human/layers";

export const CHARACTER_VARIANTS = [
  {
    id: "blue",
    label: "블루",
    color: "#4f7cff",
    human: "/assets/characters/human/layers/outfit-basic-blue.png",
    cat: "/assets/characters/cat-pattern-blue.png"
  },
  {
    id: "mint",
    label: "민트",
    color: "#2f9f8f",
    human: "/assets/characters/human/layers/outfit-basic-mint.png",
    cat: "/assets/characters/cat-pattern-mint.png"
  },
  {
    id: "coral",
    label: "코랄",
    color: "#d85f45",
    human: "/assets/characters/human/layers/outfit-basic-coral.png",
    cat: "/assets/characters/cat-pattern-coral.png"
  },
  {
    id: "gold",
    label: "골드",
    color: "#d8a333",
    human: "/assets/characters/human/layers/outfit-basic-gold.png",
    cat: "/assets/characters/cat-pattern-gold.png"
  },
  {
    id: "violet",
    label: "바이올렛",
    color: "#7b5cd6",
    human: "/assets/characters/human/layers/outfit-basic-violet.png",
    cat: "/assets/characters/cat-pattern-violet.png"
  }
] as const;

export function getCharacterAsset(species: CharacterSpecies, variantId?: string): CharacterAsset {
  const variant =
    CHARACTER_VARIANTS.find((candidate) => candidate.id === variantId) ?? CHARACTER_VARIANTS[0];
  const humanLayers: CharacterLayer[] = [
    {
      id: "base",
      src: `${HUMAN_LAYER_BASE_PATH}/base.png`,
      alt: "인간 기본 바디"
    },
    {
      id: "pants",
      src: `${HUMAN_LAYER_BASE_PATH}/pants-basic.png`,
      alt: "인간 기본 바지"
    },
    {
      id: "outfit",
      src: `${HUMAN_LAYER_BASE_PATH}/outfit-basic-${variant.id}.png`,
      alt: `인간 ${variant.label} 옷`
    },
    {
      id: "hair",
      src: `${HUMAN_LAYER_BASE_PATH}/hair-basic.png`,
      alt: "인간 기본 머리"
    },
    {
      id: "face",
      src: `${HUMAN_LAYER_BASE_PATH}/face-basic.png`,
      alt: "인간 기본 얼굴"
    }
  ];

  return {
    src: variant[species],
    layers: species === "human" ? humanLayers : undefined,
    label: variant.label,
    color: variant.color,
    variantId: variant.id
  };
}
