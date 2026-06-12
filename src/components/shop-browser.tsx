"use client";

/* eslint-disable @next/next/no-img-element */

import { Eye, Gem, Image as ImageIcon, Palette } from "lucide-react";
import type { MouseEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimShopItem, purchaseShopItems } from "@/app/shop-actions";
import { CharacterCategoryIcon } from "@/components/character-category-icon";
import { CharacterBackgroundLayer } from "@/components/character-background-layer";
import {
  getCharacterAsset,
  getHumanDisplayCategories,
  getHumanCustomization,
  getHumanItemCardLabel,
  getHumanItemFromPayload,
  shouldGroupHumanItemColors,
  type HumanLayerCategory,
  type CharacterSpecies
} from "@/lib/character-assets";
import { getCharacterBackground } from "@/lib/character-backgrounds";

export type ShopBrowserItem = {
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
  thumbnailUrl?: string | null;
};

type ShopBrowserProps = {
  character: {
    displayName: string;
    species: CharacterSpecies;
    customization: Record<string, string>;
  };
  activeSpecies: CharacterSpecies;
  characterLevel: number;
  stellBalance: number;
  attendanceDays: number;
  focusMinutes: number;
  items: ShopBrowserItem[];
  ownedIds: string[];
};

type ShopTab = HumanLayerCategory | "pattern" | "cat-eyes" | "cat-accessory" | "background";

const speciesTabs = [
  { id: "human", label: "인간" },
  { id: "cat", label: "고양이" }
] as const;

const catTabs = [
  { id: "cat-eyes", label: "눈", slot: "cat_eyes" },
  { id: "pattern", label: "무늬", slot: "cat_pattern" },
  { id: "cat-accessory", label: "악세서리", slot: "accessory" },
  { id: "background", label: "배경", slot: "background" }
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
  characterLevel,
  stellBalance,
  attendanceDays,
  focusMinutes,
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
      backgroundId: getCharacterBackground(character.customization).id,
      backgroundColor: getCharacterBackground(character.customization).color,
      backgroundImageUrl: getCharacterBackground(character.customization).imageUrl,
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
  const tabs = species === "human"
    ? [...getHumanDisplayCategories(), { id: "background", label: "배경", slot: "background" } as const]
    : catTabs;
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
  const canCheckout = cartItems.length > 0 && cartTotal <= stellBalance;
  const remainingStell = Math.max(stellBalance - cartTotal, 0);

  function isUnlocked(item: ShopBrowserItem) {
    if (item.unlock_method === "gem") return characterLevel >= item.required_level;
    if (item.unlock_method === "attendance") return attendanceDays >= item.unlock_requirement;
    return focusMinutes >= item.unlock_requirement;
  }

  function unlockLabel(item: ShopBrowserItem) {
    if (item.unlock_method === "gem") return `Lv.${item.required_level}에 해금`;
    if (item.unlock_method === "attendance") return `출석 ${item.unlock_requirement}일에 해금`;
    return `작업 ${item.unlock_requirement}분에 해금`;
  }

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

    if (ownedSet.has(item.id) || !isUnlocked(item) || item.unlock_method !== "gem") {
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

  function claim(event: MouseEvent<HTMLButtonElement>, itemId: string) {
    event.stopPropagation();
    startTransition(async () => {
      await claimShopItem(itemId);
    });
  }

  return (
    <section className="character-create-form">
      <div className="wardrobe-preview shop-character-preview">
        {asset.layers ? (
          <div className="avatar-layer-stack wardrobe-avatar-stack" aria-label={`${preview.displayName} 미리보기`}>
            <CharacterBackgroundLayer customization={preview} />
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
          <div className="avatar-layer-stack wardrobe-avatar-stack">
            <CharacterBackgroundLayer customization={preview} />
            <img
              className="avatar-layer"
              src={asset.src}
              alt={`${preview.displayName} 미리보기`}
            />
          </div>
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
              {tab.id === "background" ? (
                <ImageIcon size={20} />
              ) : species === "human" ? (
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
          const unlocked = isUnlocked(item);
          const claimable = unlocked && item.unlock_method !== "gem" && !owned;
          const tooExpensive = item.unlock_method === "gem" && !selected && cartTotal + item.cost > stellBalance;
          const catalogItem = getHumanItemFromPayload(item.payload);

          return (
            <article
              className={`wardrobe-item shop-item-card ${selected ? "selected" : ""} ${
                tooExpensive ? "too-expensive" : ""
              } ${wrongSpecies ? "disabled" : ""} ${!unlocked ? "locked" : ""} ${
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
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" />
                ) : item.slot === "background" ? (
                  <span
                    className="background-item-thumbnail"
                    style={{
                      backgroundColor: item.payload.backgroundColor ?? "#fff8eb",
                      backgroundImage: item.payload.backgroundImageUrl
                        ? `url("${item.payload.backgroundImageUrl}")`
                        : undefined
                    }}
                  />
                ) : (
                  <span className="character-item-placeholder">상품 이미지 준비 중</span>
                )}
              </span>
              <span>{catalogItem ? getHumanItemCardLabel(catalogItem) : item.name}</span>
              <strong className="price-label">
                {!unlocked ? unlockLabel(item) : item.unlock_method === "gem" ? `${item.cost} 스텔` : "무료 획득"}
              </strong>
              {owned ? (
                <span className="owned-label">보유중</span>
              ) : claimable ? (
                <button className="cart-label" type="button" disabled={isPending} onClick={(event) => claim(event, item.id)}>
                  {isPending ? "처리 중" : "받기"}
                </button>
              ) : !unlocked ? (
                <span className="cart-label">잠김</span>
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
          <p className="subtle">보유 스텔</p>
          <strong>{stellBalance.toLocaleString()} 스텔</strong>
        </div>
        <div className="shop-cart-total">
          <p className="subtle">사용 예정</p>
          <strong>{cartItems.length > 0 ? `${cartTotal.toLocaleString()} 스텔` : "0 스텔"}</strong>
          {cartItems.length > 0 && cartTotal <= stellBalance ? (
            <span className="subtle">구매 후 {remainingStell.toLocaleString()} 스텔</span>
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
        {cartTotal > stellBalance ? <p className="subtle">스텔이 부족해요.</p> : null}
      </div>

      <div className="form-actions">
        <button className="ghost-button" type="button" onClick={() => router.push("/")}>
          돌아가기
        </button>
      </div>
    </section>
  );
}
