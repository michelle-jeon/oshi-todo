export type CharacterSpecies = "human" | "cat";

export type CharacterVariantId = "blue" | "mint" | "coral" | "gold" | "violet";

export type HumanLayerCategory =
  | "body"
  | "shoes"
  | "bottom"
  | "top"
  | "hair"
  | "mouth"
  | "eyes"
  | "accessory";

export type HumanCustomizationKey =
  | "bodyId"
  | "shoesId"
  | "bottomId"
  | "topId"
  | "hairId"
  | "mouthId"
  | "eyeId"
  | "accessoryId";

export type HumanLayerAssetKey =
  | "bodyAssetUrl"
  | "shoesAssetUrl"
  | "bottomAssetUrl"
  | "topAssetUrl"
  | "hairAssetUrl"
  | "mouthAssetUrl"
  | "eyeAssetUrl"
  | "accessoryAssetUrl";

export type HumanLayerCategoryDefinition = {
  id: HumanLayerCategory;
  label: string;
  slot: string;
  customizationKey: HumanCustomizationKey;
  assetKey: HumanLayerAssetKey;
  defaultItemId: string;
  layerOrder: number;
};

export type HumanLayerItem = {
  id: string;
  category: HumanLayerCategory;
  label: string;
  src?: string;
  thumbnailSrc?: string;
  layerOrder?: number;
  color?: string;
  colorLabel?: string;
  isBasic: boolean;
  selectionPayload?: Record<string, string>;
};

export type CharacterLayer = {
  id: string;
  src: string;
  alt: string;
  layerOrder: number;
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
    human: "/assets/characters/human/layers/top/short-sleeve-shirt-blue.png",
    cat: "/assets/characters/cat-pattern-blue.png"
  },
  {
    id: "mint",
    label: "민트",
    color: "#2f9f8f",
    human: "/assets/characters/human/layers/top/short-sleeve-shirt-mint.png",
    cat: "/assets/characters/cat-pattern-mint.png"
  },
  {
    id: "coral",
    label: "코랄",
    color: "#d85f45",
    human: "/assets/characters/human/layers/top/short-sleeve-shirt-coral.png",
    cat: "/assets/characters/cat-pattern-coral.png"
  },
  {
    id: "gold",
    label: "옐로",
    color: "#d8a333",
    human: "/assets/characters/human/layers/top/short-sleeve-shirt-yellow.png",
    cat: "/assets/characters/cat-pattern-gold.png"
  },
  {
    id: "violet",
    label: "바이올렛",
    color: "#7b5cd6",
    human: "/assets/characters/human/layers/top/short-sleeve-shirt-violet.png",
    cat: "/assets/characters/cat-pattern-violet.png"
  }
] as const;

export const HUMAN_LAYER_CATEGORIES: HumanLayerCategoryDefinition[] = [
  {
    id: "body",
    label: "바디",
    slot: "human_body",
    customizationKey: "bodyId",
    assetKey: "bodyAssetUrl",
    defaultItemId: "basic-17",
    layerOrder: 10
  },
  {
    id: "shoes",
    label: "신발",
    slot: "human_shoes",
    customizationKey: "shoesId",
    assetKey: "shoesAssetUrl",
    defaultItemId: "sneakers-black",
    layerOrder: 20
  },
  {
    id: "bottom",
    label: "하의",
    slot: "human_bottom",
    customizationKey: "bottomId",
    assetKey: "bottomAssetUrl",
    defaultItemId: "straight-pants-ivory",
    layerOrder: 30
  },
  {
    id: "top",
    label: "상의",
    slot: "human_top",
    customizationKey: "topId",
    assetKey: "topAssetUrl",
    defaultItemId: "short-sleeve-shirt-blue",
    layerOrder: 40
  },
  {
    id: "hair",
    label: "헤어",
    slot: "human_hair",
    customizationKey: "hairId",
    assetKey: "hairAssetUrl",
    defaultItemId: "tousled-brown",
    layerOrder: 50
  },
  {
    id: "mouth",
    label: "입",
    slot: "human_mouth",
    customizationKey: "mouthId",
    assetKey: "mouthAssetUrl",
    defaultItemId: "smile",
    layerOrder: 60
  },
  {
    id: "eyes",
    label: "눈",
    slot: "human_eyes",
    customizationKey: "eyeId",
    assetKey: "eyeAssetUrl",
    defaultItemId: "long-black",
    layerOrder: 70
  },
  {
    id: "accessory",
    label: "악세서리",
    slot: "accessory",
    customizationKey: "accessoryId",
    assetKey: "accessoryAssetUrl",
    defaultItemId: "none",
    layerOrder: 80
  }
];

export const HUMAN_CATEGORY_DISPLAY_ORDER: HumanLayerCategory[] = [
  "body",
  "hair",
  "eyes",
  "mouth",
  "top",
  "bottom",
  "shoes",
  "accessory"
];

export const HUMAN_LAYER_ITEMS: HumanLayerItem[] = [
  {
    id: "basic-17",
    category: "body",
    label: "기본형 바디 17호",
    src: `${HUMAN_LAYER_BASE_PATH}/body/basic-17.png`,
    isBasic: true
  },
  {
    id: "sneakers-black",
    category: "shoes",
    label: "운동화",
    color: "#252525",
    colorLabel: "블랙",
    src: `${HUMAN_LAYER_BASE_PATH}/shoes/sneakers-black.png`,
    isBasic: true
  },
  {
    id: "straight-pants-ivory",
    category: "bottom",
    label: "긴 면바지",
    color: "#eee9dc",
    colorLabel: "아이보리",
    src: `${HUMAN_LAYER_BASE_PATH}/bottom/straight-pants-ivory.png`,
    isBasic: true
  },
  {
    id: "straight-pants-black",
    category: "bottom",
    label: "긴 면바지",
    color: "#252525",
    colorLabel: "블랙",
    src: `${HUMAN_LAYER_BASE_PATH}/bottom/straight-pants-black.png`,
    isBasic: true
  },
  {
    id: "short-sleeve-shirt-mint",
    category: "top",
    label: "반소매 티셔츠",
    color: "#75cdb8",
    colorLabel: "민트",
    src: `${HUMAN_LAYER_BASE_PATH}/top/short-sleeve-shirt-mint.png`,
    isBasic: true
  },
  {
    id: "short-sleeve-shirt-violet",
    category: "top",
    label: "반소매 티셔츠",
    color: "#8a6dd7",
    colorLabel: "바이올렛",
    src: `${HUMAN_LAYER_BASE_PATH}/top/short-sleeve-shirt-violet.png`,
    isBasic: true
  },
  {
    id: "short-sleeve-shirt-blue",
    category: "top",
    label: "반소매 티셔츠",
    color: "#5d91dc",
    colorLabel: "블루",
    src: `${HUMAN_LAYER_BASE_PATH}/top/short-sleeve-shirt-blue.png`,
    isBasic: true
  },
  {
    id: "short-sleeve-shirt-yellow",
    category: "top",
    label: "반소매 티셔츠",
    color: "#dfbd53",
    colorLabel: "옐로",
    src: `${HUMAN_LAYER_BASE_PATH}/top/short-sleeve-shirt-yellow.png`,
    isBasic: true
  },
  {
    id: "short-sleeve-shirt-coral",
    category: "top",
    label: "반소매 티셔츠",
    color: "#df7668",
    colorLabel: "코랄",
    src: `${HUMAN_LAYER_BASE_PATH}/top/short-sleeve-shirt-coral.png`,
    isBasic: true
  },
  {
    id: "tousled-gray",
    category: "hair",
    label: "더벅머리",
    color: "#8e8e8e",
    colorLabel: "그레이",
    src: `${HUMAN_LAYER_BASE_PATH}/hair/tousled-gray.png`,
    isBasic: true
  },
  {
    id: "tousled-red",
    category: "hair",
    label: "더벅머리",
    color: "#b75045",
    colorLabel: "레드",
    src: `${HUMAN_LAYER_BASE_PATH}/hair/tousled-red.png`,
    isBasic: true
  },
  {
    id: "tousled-brown",
    category: "hair",
    label: "더벅머리",
    color: "#76503c",
    colorLabel: "브라운",
    src: `${HUMAN_LAYER_BASE_PATH}/hair/tousled-brown.png`,
    isBasic: true
  },
  {
    id: "tousled-yellow",
    category: "hair",
    label: "더벅머리",
    color: "#d2ad50",
    colorLabel: "옐로",
    src: `${HUMAN_LAYER_BASE_PATH}/hair/tousled-yellow.png`,
    isBasic: true
  },
  {
    id: "smile",
    category: "mouth",
    label: "웃는 입",
    src: `${HUMAN_LAYER_BASE_PATH}/mouth/smile.png`,
    isBasic: true
  },
  {
    id: "long-green",
    category: "eyes",
    label: "길쭉 눈",
    color: "#5c8d65",
    colorLabel: "그린",
    src: `${HUMAN_LAYER_BASE_PATH}/eyes/long-green.png`,
    isBasic: true
  },
  {
    id: "long-red-brown",
    category: "eyes",
    label: "길쭉 눈",
    color: "#8d4e45",
    colorLabel: "레드브라운",
    src: `${HUMAN_LAYER_BASE_PATH}/eyes/long-red-brown.png`,
    isBasic: true
  },
  {
    id: "long-black",
    category: "eyes",
    label: "길쭉 눈",
    color: "#252525",
    colorLabel: "블랙",
    src: `${HUMAN_LAYER_BASE_PATH}/eyes/long-black.png`,
    isBasic: true
  },
  {
    id: "long-blue",
    category: "eyes",
    label: "길쭉 눈",
    color: "#557fac",
    colorLabel: "블루",
    src: `${HUMAN_LAYER_BASE_PATH}/eyes/long-blue.png`,
    isBasic: true
  },
  {
    id: "none",
    category: "accessory",
    label: "없음",
    isBasic: true
  }
];

export function getHumanCategory(category: HumanLayerCategory) {
  return HUMAN_LAYER_CATEGORIES.find((candidate) => candidate.id === category);
}

export function getHumanCategoryItems(category: HumanLayerCategory) {
  return HUMAN_LAYER_ITEMS.filter((item) => item.category === category);
}

export function getHumanDisplayCategories() {
  return HUMAN_CATEGORY_DISPLAY_ORDER.flatMap((categoryId) => {
    const category = getHumanCategory(categoryId);

    return category ? [category] : [];
  });
}

export function getHumanItem(category: HumanLayerCategory, itemId: string) {
  return HUMAN_LAYER_ITEMS.find(
    (item) => item.category === category && item.id === itemId
  );
}

export function getHumanItemFromPayload(payload: Record<string, string>) {
  return HUMAN_LAYER_CATEGORIES.flatMap((category) => {
    const itemId = payload[category.customizationKey];

    return itemId ? [getHumanItem(category.id, itemId)] : [];
  }).find((item): item is HumanLayerItem => Boolean(item));
}

export function getHumanItemStyleKey(item: HumanLayerItem) {
  return item.label;
}

export function shouldGroupHumanItemColors(category: HumanLayerCategory) {
  return category === "hair" || category === "eyes";
}

export function getDefaultHumanCustomization() {
  return Object.fromEntries(
    HUMAN_LAYER_CATEGORIES.map((category) => [category.customizationKey, category.defaultItemId])
  ) as Record<HumanCustomizationKey, string>;
}

export function getHumanCustomization(customization?: Record<string, string> | string) {
  const source = typeof customization === "string" ? { variantId: customization } : customization ?? {};
  const defaults = getDefaultHumanCustomization();
  const legacyTopId = source.variantId
    ? `short-sleeve-shirt-${source.variantId === "gold" ? "yellow" : source.variantId}`
    : defaults.topId;

  return {
    ...defaults,
    ...source,
    bodyId: source.bodyId ?? defaults.bodyId,
    shoesId: source.shoesId ?? defaults.shoesId,
    bottomId: source.bottomId ?? defaults.bottomId,
    topId: source.topId ?? legacyTopId,
    hairId: source.hairId === "basic" ? defaults.hairId : source.hairId ?? defaults.hairId,
    mouthId: source.mouthId ?? defaults.mouthId,
    eyeId: source.eyeId === "basic" ? defaults.eyeId : source.eyeId ?? defaults.eyeId,
    accessoryId: source.accessoryId ?? defaults.accessoryId
  } as Record<string, string> & Record<HumanCustomizationKey, string>;
}

export function getHumanItemPayload(item: HumanLayerItem) {
  if (item.selectionPayload) {
    return item.selectionPayload;
  }

  const category = getHumanCategory(item.category);

  return category
    ? { [category.customizationKey]: item.id, [category.assetKey]: "" }
    : {};
}

export function getHumanItemThumbnail(item: HumanLayerItem) {
  return item.thumbnailSrc;
}

export function getCharacterAsset(
  species: CharacterSpecies,
  customization?: Record<string, string> | string
): CharacterAsset {
  const variantId =
    typeof customization === "string" ? customization : customization?.variantId;
  const variant =
    CHARACTER_VARIANTS.find((candidate) => candidate.id === variantId) ?? CHARACTER_VARIANTS[0];

  if (species === "cat") {
    return {
      src: variant.cat,
      label: variant.label,
      color: variant.color,
      variantId: variant.id
    };
  }

  const selection = getHumanCustomization(customization);
  const humanLayers = HUMAN_LAYER_CATEGORIES.flatMap((category) => {
    const selectedId = selection[category.customizationKey];
    const customLayerSrc = selection[category.assetKey];
    const item = HUMAN_LAYER_ITEMS.find(
      (candidate) => candidate.category === category.id && candidate.id === selectedId
    );
    const layerSrc = customLayerSrc || item?.src;

    if (!layerSrc) {
      return [];
    }

    return [
      {
        id: `${category.id}:${selectedId}`,
        src: layerSrc,
        alt: `인간 ${item?.label ?? category.label}${item?.colorLabel ? ` ${item.colorLabel}` : ""}`,
        layerOrder: item?.layerOrder ?? category.layerOrder
      }
    ];
  }).sort((a, b) => a.layerOrder - b.layerOrder);

  return {
    src: variant.human,
    layers: humanLayers,
    label: "기본 인간",
    color: variant.color,
    variantId: variant.id
  };
}
