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

type ShopPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type CharacterRow = {
  id: string;
  display_name: string;
  species: CharacterSpecies;
  xp_current: number;
  customization: Record<string, string>;
};

type ShopItem = {
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

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { message } = await searchParams;
  const { data: character } = await supabase
    .from("characters")
    .select("id, display_name, species, xp_current, customization")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<CharacterRow>();
  const [{ data: shopItems }, { data: inventory }] = await Promise.all([
    supabase
      .from("shop_items")
      .select("id, code, name, slot, species, cost, payload, thumbnail_url, shop_item_variants(species, slot, payload, layer_asset_url)")
      .eq("is_active", true)
      .eq("unlock_method", "gem")
      .order("sort_order", { ascending: true })
      .order("cost", { ascending: true })
      .returns<ShopItem[]>(),
    character
      ? supabase
          .from("character_inventory")
          .select("shop_item_id")
          .eq("character_id", character.id)
      : Promise.resolve({ data: [] })
  ]);
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

      <ShopBrowser
        character={{
          displayName: character?.display_name ?? "캐릭터",
          species: character?.species ?? "human",
          customization: character?.customization ?? {}
        }}
        activeSpecies={character?.species ?? "human"}
        currentXp={character?.xp_current ?? 0}
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

            return normalized ? [{ ...normalized, thumbnailUrl: item.thumbnail_url }] : [];
          });
        })}
        ownedIds={ownedIds}
      />
    </main>
  );
}
