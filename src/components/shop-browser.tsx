"use client";

/* eslint-disable @next/next/no-img-element */

import { Eye, Gem, Palette } from "lucide-react";
import type { MouseEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseShopItems } from "@/app/shop-actions";
import { CharacterCategoryIcon } from "@/components/character-category-icon";
import {
  getCharacterAsset,
  getHumanDisplayCategories,
  getHumanCustomization,
  getHumanItemFromPayload,
  shouldGroupHumanItemColors,
  type HumanLayerCategory,
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

type ShopTab = HumanLayerCategory | "pattern" | "cat-eyes" | "cat-accessory";

const speciesTabs = [
  { id: "human", label: "인간" },
  { id: "cat", label: "고양이" }
] as const;

const catTabs = [
  { id: "cat-eyes", label: "눈", slot: "cat_eyes" },
  { id: "pattern", label: "무늬", slot: "cat_pattern" },
  { id: "cat-accessory", label: "악세서리", slot: "accessory" }
] as const;

function applyPayloadToPreview<T extends Record<string, string>>(
  current: T,
  payload: Record<string, string>
) {
  return {
    ...current,
    ...payload,
    hairId: payload.hairId ?? payload.hairStyle ?? current.hairId,
    variantId: payload.variantId ?? current.variantId,
    accessoryId: payload.accessoryId ?? current.accessoryId,
    eyeId: payload.eyeId ?? current.eyeId
  } as T;
}

export function ShopBrowser({
  character,
  activeSpecies,
  currentXp,
  items,
  ownedIds
}: ShopBrowserProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [species, setSpecies] = useState<CharacterSpecies>(activeSpecies);
  const [activeTab, setActiveTab] = useState<ShopTab>(activeSpecies === "human" ? "body" : "cat-eyes");
  const [cartBySlot, setCartBySlot] = useState<Record<string, ShopBrowserItem>>({});
  const initialPreview = useMemo(
    () => ({
      displayName: character.displayName,
      variantId: character.customization.variantId ?? "blue",
      accessoryId: character.customization.accessoryId ?? "none",
      hairId: character.customization.hairId ?? "basic",
      eyeId: character.customization.eyeId ?? "basic",
      ...(character.species === "human" ? getHumanCustomization(character.customization) : {})
    }),
    [character.customization, character.displayName, character.species]
  );
  const [preview, setPreview] = useState(initialPreview);
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const tabs = species === "human" ? getHumanDisplayCategories() : catTabs;
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const visibleItems = items.filter(
    (item) => item.species === species && item.slot === selectedTab.slot
  );
  const groupedVisibleItems = Array.from(
    visibleItems.reduce((groups, item) => {
      const catalogItem = getHumanItemFromPayload(item.payload);
      const shouldGroupColors =
        species === "human" &&
        shouldGroupHumanItemColors(selectedTab.id as HumanLayerCategory);
      const key = shouldGroupColors && catalogItem ? catalogItem.label : item.id;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
      return groups;
    }, new Map<string, ShopBrowserItem[]>())
  );
  const displayItems = groupedVisibleItems.map(([, group]) => {
    const selectedInGroup = group.find((item) => {
      const catalogItem = getHumanItemFromPayload(item.payload);
      const category = catalogItem
        ? getHumanDisplayCategories().find((candidate) => candidate.id === catalogItem.category)
        : undefined;

      return category ? preview[category.customizationKey] === catalogItem?.id : false;
    });

    return selectedInGroup ?? group[0];
  });
  const shopColorItems =
    species === "human" &&
    shouldGroupHumanItemColors(selectedTab.id as HumanLayerCategory)
      ? groupedVisibleItems.flatMap(([, group]) => (group.length > 1 ? group : []))
      : [];
  const asset = getCharacterAsset(character.species, preview);
  const cartItems = Object.values(cartBySlot);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.cost, 0);
  const canCheckout = cartItems.length > 0 && cartTotal <= currentXp;
  const remainingXp = Math.max(currentXp - cartTotal, 0);

  function switchSpecies(nextSpecies: CharacterSpecies) {
    setSpecies(nextSpecies);
    setActiveTab(nextSpecies === "human" ? "body" : "cat-eyes");
  }

  function previewItem(item: ShopBrowserItem) {
    if (item.species !== activeSpecies) {
      return;
    }

    setPreview((current) => {
      const nextPreview = applyPayloadToPreview(current, item.payload);

      if (JSON.stringify(nextPreview) === JSON.stringify(current)) {
        return current;
      }

      return nextPreview;
    });
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
              <img
                className="avatar-layer"
                key={layer.id}
                src={layer.src}
                alt={layer.alt}
              />
            ))}
          </div>
        ) : (
          <img
            className="avatar-image"
            src={asset.src}
            alt={`${preview.displayName} 미리보기`}
          />
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
          return (
            <button
              className={activeTab === tab.id ? "selected" : ""}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              title={tab.label}
            >
              {species === "human" ? (
                <CharacterCategoryIcon category={tab.id as HumanLayerCategory} />
              ) : tab.id === "pattern" ? (
                <Palette size={20} />
              ) : tab.id === "cat-eyes" ? (
                <Eye size={20} />
              ) : (
                <Gem size={20} />
              )}
            </button>
          );
        })}
      </div>

      {shopColorItems.length > 0 ? (
        <div className="character-color-options" aria-label={`${selectedTab.label} 색상`}>
          {shopColorItems.map((item) => {
            const catalogItem = getHumanItemFromPayload(item.payload);
            const selected = catalogItem
              ? preview[
                  getHumanDisplayCategories().find(
                    (category) => category.id === catalogItem.category
                  )?.customizationKey ?? "hairId"
                ] === catalogItem.id
              : false;

            return (
              <button
                className={selected ? "selected" : ""}
                key={item.id}
                type="button"
                onClick={() => tryOnItem(item)}
                aria-label={`${item.name} 색상 선택`}
              >
                <span style={{ background: catalogItem?.color ?? "#d9d4cb" }} />
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="wardrobe-grid">
        {displayItems.map((item) => {
          const owned = ownedSet.has(item.id);
          const selected = cartBySlot[item.slot]?.id === item.id;
          const wrongSpecies = item.species !== activeSpecies;
          const tooExpensive = !selected && cartTotal + item.cost > currentXp;
          const catalogItem = getHumanItemFromPayload(item.payload);

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
              <span className="character-item-image">
                <img src={catalogItem?.src ?? asset.src} alt="" />
              </span>
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
        {displayItems.length === 0 ? <div className="empty-state">아직 아이템이 없어요.</div> : null}
      </div>

      <div className="shop-cart-panel">
        <div>
          <p className="subtle">사용 가능 XP</p>
          <strong>{currentXp.toLocaleString()} XP</strong>
        </div>
        <div className="shop-cart-total">
          <p className="subtle">사용 예정</p>
          <strong>{cartItems.length > 0 ? `${cartTotal.toLocaleString()} XP` : "0 XP"}</strong>
          {cartItems.length > 0 && cartTotal <= currentXp ? (
            <span className="subtle">구매 후 {remainingXp.toLocaleString()} XP</span>
          ) : null}
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
        <button className="primary-button" type="button" onClick={checkout} disabled={!canCheckout || isPending}>
          {isPending ? "구매 중" : "한 번에 구매"}
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
