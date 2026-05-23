import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { purchaseShopItem } from "@/app/shop-actions";
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

const humanSections = [
  { key: "human_hair", label: "헤어" },
  { key: "human_eyes", label: "눈" },
  { key: "human_outfit", label: "옷" },
  { key: "accessory", label: "악세서리" }
];

const catSections = [
  { key: "cat_eyes", label: "눈" },
  { key: "cat_pattern", label: "무늬" },
  { key: "accessory", label: "악세서리" }
];

function ShopItemCard({
  item,
  activeSpecies,
  ownedIds,
  currentXp
}: {
  item: ShopItem;
  activeSpecies?: CharacterSpecies;
  ownedIds: Set<string>;
  currentXp: number;
}) {
  const canBuy = item.species === activeSpecies && !ownedIds.has(item.id) && currentXp >= item.cost;

  return (
    <article className={`shop-card ${item.species !== activeSpecies ? "disabled" : ""}`}>
      <div>
        <strong>{item.name}</strong>
        <p className="subtle">{item.cost} XP</p>
      </div>
      {ownedIds.has(item.id) ? (
        <span className="owned-label">보유중</span>
      ) : (
        <form action={purchaseShopItem.bind(null, item.id)}>
          <button className="ghost-button" type="submit" disabled={!canBuy}>
            구매
          </button>
        </form>
      )}
    </article>
  );
}

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
  const ownedIds = new Set((inventory ?? []).map((item) => item.shop_item_id as string));

  return (
    <main className="shop-shell">
      <header className="shop-header">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1>
            <ShoppingBag size={24} /> 상점
          </h1>
        </div>
        <Link className="ghost-button" href="/">
          돌아가기
        </Link>
      </header>

      {message ? <p className="notice">{message}</p> : null}

      <section className="shop-species-section">
        <h2>인간</h2>
        {humanSections.map((section) => (
          <div className="shop-section" key={section.key}>
            <h3>{section.label}</h3>
            <div className="shop-grid">
              {(shopItems ?? [])
                .filter((item) => item.species === "human" && item.slot === section.key)
                .map((item) => (
                  <ShopItemCard
                    activeSpecies={character?.species}
                    currentXp={character?.xp_current ?? 0}
                    item={item}
                    key={item.id}
                    ownedIds={ownedIds}
                  />
                ))}
            </div>
          </div>
        ))}
      </section>

      <section className="shop-species-section">
        <h2>고양이</h2>
        {catSections.map((section) => (
          <div className="shop-section" key={section.key}>
            <h3>{section.label}</h3>
            <div className="shop-grid">
              {(shopItems ?? [])
                .filter((item) => item.species === "cat" && item.slot === section.key)
                .map((item) => (
                  <ShopItemCard
                    activeSpecies={character?.species}
                    currentXp={character?.xp_current ?? 0}
                    item={item}
                    key={item.id}
                    ownedIds={ownedIds}
                  />
                ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
