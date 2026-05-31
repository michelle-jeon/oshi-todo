"use client";

import Image from "next/image";
import { Eye, Gem, Palette, Scissors, Shirt } from "lucide-react";
import type { MouseEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseShopItems } from "@/app/shop-actions";
import {
  CHARACTER_VARIANTS,
  getCharacterAsset,
  type CharacterSpecies
} from "@/lib/character-assets";

export type ShopBrowserItem = {
  id: string;
  code: string;
  name: string;
  slot: string;
  species: CharacterSpecies | null;
  cost: number;
  payload: Record<string, string>;
};

type ShopBrowserProps = {
  character: {
    displayName: string;
    species: CharacterSpecies;
    customization: Record<string, string>;
  };
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

function inferVariantId(item: ShopBrowserItem) {
  const directVariant = item.payload.variantId;

  if (CHARACTER_VARIANTS.some((variant) => variant.id === directVariant)) {
    return directVariant;
  }

  const searchableText = `${item.code} ${item.name}`.toLowerCase();
  const matchingVariant = CHARACTER_VARIANTS.find(
    (variant) =>
      searchableText.includes(variant.id) || searchableText.includes(variant.label.toLowerCase())
  );

  return matchingVariant?.id;
}

export function ShopBrowser({
  character,
  activeSpecies,
  currentXp,
  items,
  ownedIds
}: ShopBrowserProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [species, setSpecies] = useState<CharacterSpecies>(activeSpecies);
  const [activeTab, setActiveTab] = useState<ShopTab>(activeSpecies === "human" ? "hair" : "eyes");
  const [cartBySlot, setCartBySlot] = useState<Record<string, ShopBrowserItem>>({});
  const initialPreview = useMemo(
    () => ({
      displayName: character.displayName,
      variantId: character.customization.variantId ?? "blue",
      accessoryId: character.customization.accessoryId ?? "none",
      hairId: character.customization.hairId ?? "basic",
      eyeId: character.customization.eyeId ?? "basic"
    }),
    [character.customization, character.displayName]
  );
  const [preview, setPreview] = useState(initialPreview);
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const tabs = species === "human" ? humanTabs : catTabs;
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const visibleItems = items.filter(
    (item) => item.species === species && item.slot === selectedTab.slot
  );
  const asset = getCharacterAsset(character.species, preview.variantId);
  const cartItems = Object.values(cartBySlot);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.cost, 0);
  const canCheckout = cartItems.length > 0 && cartTotal <= currentXp;

  function switchSpecies(nextSpecies: CharacterSpecies) {
    setSpecies(nextSpecies);
    setActiveTab(nextSpecies === "human" ? "hair" : "eyes");
  }

  function previewItem(item: ShopBrowserItem) {
    if (item.species !== activeSpecies) {
      return;
    }

    const variantId = inferVariantId(item);

    setPreview((current) => ({
      ...current,
      variantId: variantId ?? current.variantId,
      accessoryId: item.payload.accessoryId ?? current.accessoryId,
      hairId: item.payload.hairId ?? item.payload.hairStyle ?? current.hairId,
      eyeId: item.payload.eyeId ?? current.eyeId
    }));
  }

  function tryOnItem(item: ShopBrowserItem) {
    if (item.species !== activeSpecies) {
      return;
    }

    previewItem(item);

    if (ownedSet.has(item.id)) {
      return;
    }

    setCartBySlot((current) => ({
      ...current,
      [item.slot]: item
    }));
  }

  function removeCartItem(slot: string) {
    setCartBySlot((current) => {
      const nextCart = { ...current };
      delete nextCart[slot];

      return nextCart;
    });
  }

  function checkout(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    startTransition(async () => {
      await purchaseShopItems(cartItems.map((item) => item.id));
    });
  }

  return (
    <section className="character-create-form">
      <div className="wardrobe-preview shop-character-preview">
        {asset.layers ? (
          <div className="avatar-layer-stack wardrobe-avatar-stack" aria-label={`${preview.displayName} 미리보기`}>
            {asset.layers.map((layer) => (
              <Image
                className="avatar-layer"
                key={layer.id}
                src={layer.src}
                alt={layer.alt}
                width={1024}
                height={1024}
              />
            ))}
          </div>
        ) : (
          <Image src={asset.src} alt={`${preview.displayName} 미리보기`} width={512} height={512} />
        )}
        <div>
          <p className="subtle">현재 캐릭터</p>
          <h2>{preview.displayName}</h2>
          <p className="subtle">{character.species === "human" ? "인간" : "고양이"}</p>
        </div>
      </div>

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
          const selected = cartBySlot[item.slot]?.id === item.id;
          const wrongSpecies = item.species !== activeSpecies;
          const tooExpensive = !selected && cartTotal + item.cost > currentXp;

          return (
            <article
              className={`wardrobe-item shop-item-card ${selected ? "selected" : ""} ${
                tooExpensive ? "too-expensive" : ""
              } ${wrongSpecies ? "disabled" : ""} ${
                !owned && selected ? "in-cart" : ""
              }`}
              key={item.id}
              onClick={() => tryOnItem(item)}
              onFocus={() => previewItem(item)}
              onMouseEnter={() => previewItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  tryOnItem(item);
                }
              }}
              role="button"
              tabIndex={wrongSpecies ? -1 : 0}
            >
              <span>{item.name}</span>
              <strong className="price-label">{item.cost} XP</strong>
              {owned ? (
                <span className="owned-label">보유중</span>
              ) : (
                <span className="cart-label">{selected ? "선택됨" : "입어보기"}</span>
              )}
            </article>
          );
        })}
        {visibleItems.length === 0 ? <div className="empty-state">아직 아이템이 없어요.</div> : null}
      </div>

      <div className="shop-cart-panel">
        <div>
          <p className="subtle">선택한 아이템</p>
          <strong>{cartItems.length > 0 ? `${cartItems.length}개 · ${cartTotal} XP` : "아직 없어요"}</strong>
        </div>
        {cartItems.length > 0 ? (
          <div className="shop-cart-list">
            {cartItems.map((item) => (
              <button
                className="shop-cart-chip"
                key={item.id}
                type="button"
                onClick={() => removeCartItem(item.slot)}
                title="선택 해제"
              >
                {item.name} ×
              </button>
            ))}
          </div>
        ) : null}
        <button className="primary-button" type="button" onClick={checkout} disabled={!canCheckout}>
          한 번에 구매
        </button>
        {cartTotal > currentXp ? <p className="subtle">XP가 부족해요.</p> : null}
      </div>

      <div className="form-actions">
        <button className="ghost-button" type="button" onClick={() => router.push("/")}>
          돌아가기
        </button>
      </div>
    </section>
  );
}
