import { ShoppingBag } from "lucide-react";
import { ShopBrowser } from "@/components/shop-browser";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CharacterSpecies } from "@/lib/character-assets";
import {
  getShopItemForSpecies,
  getShopItemVariants,
  type ShopItemVariant
} from "@/lib/shop-catalog";
import { isMissingBasicCatalogSchema, isMissingStellSchema, STELL_SCHEMA_MESSAGE } from "@/lib/shop-schema";
import { getLevelFromTotalXp } from "@/lib/xp";

type ShopPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type CharacterRow = {
  id: string;
  display_name: string;
  species: CharacterSpecies;
  level: number;
  xp_total: number;
  stell_balance: number;
  xp_current?: number;
  customization: Record<string, string>;
};

type ShopItem = {
  id: string;
  code: string;
  name: string;
  slot: string;
  species: CharacterSpecies | null;
  cost: number;
  unlock_method: "gem" | "attendance" | "focus";
  unlock_requirement: number;
  required_level: number;
  payload: Record<string, string>;
  thumbnail_url?: string | null;
  shop_item_variants?: ShopItemVariant | ShopItemVariant[] | null;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { message } = await searchParams;
  const characterResult = await supabase
    .from("characters")
    .select("id, display_name, species, level, xp_total, stell_balance, customization")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<CharacterRow>();
  const fallbackCharacterResult = isMissingStellSchema(characterResult.error)
    ? await supabase
        .from("characters")
        .select("id, display_name, species, level, xp_current, xp_total, customization")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single<Omit<CharacterRow, "stell_balance"> & { xp_current: number }>()
    : null;
  const character = fallbackCharacterResult?.data
    ? { ...fallbackCharacterResult.data, stell_balance: fallbackCharacterResult.data.xp_current }
    : characterResult.data;
  const shopItemResult = await supabase
    .from("shop_items")
    .select("id, code, name, slot, species, cost, unlock_method, unlock_requirement, required_level, payload, thumbnail_url, shop_item_variants(species, slot, payload, layer_asset_url)")
    .eq("is_active", true)
    .eq("is_basic", false)
    .order("sort_order", { ascending: true })
    .order("cost", { ascending: true })
    .returns<ShopItem[]>();
  const missingStellSchema = isMissingStellSchema(shopItemResult.error) || Boolean(fallbackCharacterResult);
  const fallbackShopItemResult = isMissingBasicCatalogSchema(shopItemResult.error) || missingStellSchema
    ? await supabase
        .from("shop_items")
        .select("id, code, name, slot, species, cost, payload, thumbnail_url, shop_item_variants(species, slot, payload, layer_asset_url)")
        .eq("is_active", true)
        .eq("unlock_method", "gem")
        .order("sort_order", { ascending: true })
        .order("cost", { ascending: true })
        .returns<ShopItem[]>()
    : null;
  const shopItems = fallbackShopItemResult?.data
    ? fallbackShopItemResult.data.map((item) => ({
        ...item,
        unlock_method: "gem" as const,
        unlock_requirement: 0,
        required_level: 1
      }))
    : shopItemResult.data;
  const [{ count: attendanceDays }, { data: focusLogs }] = await Promise.all([
    supabase
      .from("user_attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("focus_window_logs")
      .select("seconds")
      .eq("user_id", user.id)
      .returns<Array<{ seconds: number }>>()
  ]);
  const focusMinutes = Math.floor((focusLogs ?? []).reduce((sum, log) => sum + log.seconds, 0) / 60);
  const { data: inventory } = character
    ? await supabase
        .from("character_inventory")
        .select("shop_item_id")
        .eq("character_id", character.id)
    : { data: [] };
  const ownedIds = (inventory ?? []).map((item) => item.shop_item_id as string);

  return (
    <main className="shop-shell">
      <header className="shop-header">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1>
            <ShoppingBag size={24} /> 상점
          </h1>
        </div>
      </header>

      {message ? <p className="notice">{message}</p> : null}
      {missingStellSchema ? <p className="notice">{STELL_SCHEMA_MESSAGE}</p> : null}

      <ShopBrowser
        character={{
          displayName: character?.display_name ?? "캐릭터",
          species: character?.species ?? "human",
          customization: character?.customization ?? {}
        }}
        activeSpecies={character?.species ?? "human"}
        characterLevel={getLevelFromTotalXp(character?.xp_total ?? 0)}
        stellBalance={character?.stell_balance ?? 0}
        attendanceDays={attendanceDays ?? 0}
        focusMinutes={focusMinutes}
        items={(shopItems ?? []).flatMap((item) => {
          const variantSpecies = getShopItemVariants(item).map((variant) => variant.species);
          const speciesList =
            variantSpecies.length > 0
              ? variantSpecies
              : item.species
                ? [item.species]
                : (["human", "cat"] as const);

          return speciesList.flatMap((species) => {
            const normalized = getShopItemForSpecies(item, species);

            return normalized ? [{
              ...normalized,
              unlock_method: item.unlock_method,
              unlock_requirement: item.unlock_requirement,
              required_level: item.required_level,
              thumbnailUrl: item.thumbnail_url
            }] : [];
          });
        })}
        ownedIds={ownedIds}
      />
    </main>
  );
}
