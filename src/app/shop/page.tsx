import { ShoppingBag } from "lucide-react";
import { ShopBrowser } from "@/components/shop-browser";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CharacterSpecies } from "@/lib/character-assets";

type ShopPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type CharacterRow = {
  id: string;
  species: CharacterSpecies;
  xp_current: number;
};

type ShopItem = {
  id: string;
  name: string;
  slot: string;
  species: CharacterSpecies | null;
  cost: number;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { message } = await searchParams;
  const [{ data: character }, { data: shopItems }, { data: inventory }] = await Promise.all([
    supabase
      .from("characters")
      .select("id, species, xp_current")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single<CharacterRow>(),
    supabase
      .from("shop_items")
      .select("id, name, slot, species, cost")
      .eq("is_active", true)
      .order("cost", { ascending: true })
      .returns<ShopItem[]>(),
    supabase.from("character_inventory").select("shop_item_id")
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
        activeSpecies={character?.species ?? "human"}
        currentXp={character?.xp_current ?? 0}
        items={shopItems ?? []}
        ownedIds={ownedIds}
      />
    </main>
  );
}
