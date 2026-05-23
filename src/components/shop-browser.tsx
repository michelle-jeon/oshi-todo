"use client";

import { Eye, Gem, Palette, Scissors, Shirt } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseShopItem } from "@/app/shop-actions";
import type { CharacterSpecies } from "@/lib/character-assets";

export type ShopBrowserItem = {
  id: string;
  name: string;
  slot: string;
  species: CharacterSpecies | null;
  cost: number;
};

type ShopBrowserProps = {
  activeSpecies: CharacterSpecies;
  currentXp: number;
  items: ShopBrowserItem[];
  ownedIds: string[];
};

type ShopTab = "hair" | "eyes" | "outfit" | "pattern" | "accessory";

const speciesTabs = [
  { id: "human", label: "인간" },
  { id: "cat", label: "고양이" }
] as const;

const humanTabs = [
  { id: "hair", label: "헤어", icon: Scissors, slot: "human_hair" },
  { id: "eyes", label: "눈", icon: Eye, slot: "human_eyes" },
  { id: "outfit", label: "옷", icon: Shirt, slot: "human_outfit" },
  { id: "accessory", label: "악세서리", icon: Gem, slot: "accessory" }
] as const;

const catTabs = [
  { id: "eyes", label: "눈", icon: Eye, slot: "cat_eyes" },
  { id: "pattern", label: "무늬", icon: Palette, slot: "cat_pattern" },
  { id: "accessory", label: "악세서리", icon: Gem, slot: "accessory" }
] as const;

export function ShopBrowser({ activeSpecies, currentXp, items, ownedIds }: ShopBrowserProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [species, setSpecies] = useState<CharacterSpecies>(activeSpecies);
  const [activeTab, setActiveTab] = useState<ShopTab>(activeSpecies === "human" ? "hair" : "eyes");
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const tabs = species === "human" ? humanTabs : catTabs;
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const visibleItems = items.filter(
    (item) => item.species === species && item.slot === selectedTab.slot
  );

  function switchSpecies(nextSpecies: CharacterSpecies) {
    setSpecies(nextSpecies);
    setActiveTab(nextSpecies === "human" ? "hair" : "eyes");
  }

  function buy(itemId: string) {
    startTransition(async () => {
      await purchaseShopItem(itemId);
    });
  }

  return (
    <section className="character-create-form">
      <div className="species-tabs">
        {speciesTabs.map((tab) => (
          <button
            className={species === tab.id ? "selected" : ""}
            key={tab.id}
            type="button"
            onClick={() => switchSpecies(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="wardrobe-tabs" aria-label="상점 탭">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={activeTab === tab.id ? "selected" : ""}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              title={tab.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div className="wardrobe-grid">
        {visibleItems.map((item) => {
          const owned = ownedSet.has(item.id);
          const wrongSpecies = item.species !== activeSpecies;
          const tooExpensive = currentXp < item.cost;
          const canBuy = !owned && !wrongSpecies && !tooExpensive;

          return (
            <article
              className={`wardrobe-item shop-item-card ${tooExpensive ? "too-expensive" : ""} ${
                wrongSpecies ? "disabled" : ""
              }`}
              key={item.id}
            >
              <span>{item.name}</span>
              <strong className="price-label">{item.cost} XP</strong>
              {owned ? (
                <span className="owned-label">보유중</span>
              ) : (
                <button className="ghost-button" type="button" onClick={() => buy(item.id)} disabled={!canBuy}>
                  구매
                </button>
              )}
            </article>
          );
        })}
        {visibleItems.length === 0 ? <div className="empty-state">아직 아이템이 없어요.</div> : null}
      </div>

      <div className="form-actions">
        <button className="ghost-button" type="button" onClick={() => router.push("/")}>
          돌아가기
        </button>
      </div>
    </section>
  );
}
