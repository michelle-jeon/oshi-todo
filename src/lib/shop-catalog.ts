import type { CharacterSpecies } from "@/lib/character-assets";

export type ShopItemVariant = {
  species: CharacterSpecies;
  slot: string;
  payload: Record<string, string>;
  layer_asset_url?: string | null;
};

const HUMAN_LAYER_ASSET_KEYS: Record<string, string> = {
  human_body: "bodyAssetUrl",
  human_shoes: "shoesAssetUrl",
  human_bottom: "bottomAssetUrl",
  human_top: "topAssetUrl",
  human_hair: "hairAssetUrl",
  human_mouth: "mouthAssetUrl",
  human_eyes: "eyeAssetUrl",
  accessory: "accessoryAssetUrl"
};

export type CatalogShopItem = {
  id: string;
  code: string;
  name: string;
  slot: string;
  species: CharacterSpecies | null;
  cost: number;
  payload: Record<string, string>;
  thumbnail_url?: string | null;
  shop_item_variants?: ShopItemVariant | ShopItemVariant[] | null;
};

export function getShopItemVariants(item: CatalogShopItem) {
  if (!item.shop_item_variants) {
    return [];
  }

  return Array.isArray(item.shop_item_variants)
    ? item.shop_item_variants
    : [item.shop_item_variants];
}

export function getShopItemForSpecies(item: CatalogShopItem, species: CharacterSpecies) {
  const variant = getShopItemVariants(item).find((candidate) => candidate.species === species);

  if (variant) {
    const layerAssetKey = HUMAN_LAYER_ASSET_KEYS[variant.slot];

    return {
      ...item,
      species,
      slot: variant.slot,
      payload: layerAssetKey
        ? { ...variant.payload, [layerAssetKey]: variant.layer_asset_url ?? "" }
        : variant.payload
    };
  }

  if (item.species === null || item.species === species) {
    return item;
  }

  return null;
}
