"use client";

/* eslint-disable @next/next/no-img-element */

import { Eye, Gem, Palette, Scissors, Shirt } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWardrobe } from "@/app/character-actions";
import {
  CHARACTER_VARIANTS,
  getCharacterAsset,
  type CharacterSpecies
} from "@/lib/character-assets";

type WardrobeTab = "hair" | "eyes" | "outfit" | "pattern" | "accessory";

type WardrobeEditorProps = {
  character: {
    displayName: string;
    species: CharacterSpecies;
    customization: Record<string, string>;
  };
  inventoryItems: WardrobeInventoryItem[];
};

type WardrobeInventoryItem = {
  id: string;
  code: string;
  name: string;
  slot: string;
  species: CharacterSpecies | null;
  payload: Record<string, string>;
};

type WardrobeDraft = {
  displayName: string;
  variantId: string;
  accessoryId: string;
  hairId: string;
  eyeId: string;
};

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

const freeItems = {
  hair: [{ id: "free-hair-basic", label: "기본", payload: { hairId: "basic" } }],
  eyes: [{ id: "free-eyes-basic", label: "기본", payload: { eyeId: "basic" } }],
  outfit: CHARACTER_VARIANTS.map((variant) => ({
    id: `free-outfit-${variant.id}`,
    label: variant.label,
    payload: { variantId: variant.id },
    swatch: variant.color
  })),
  pattern: CHARACTER_VARIANTS.map((variant) => ({
    id: `free-pattern-${variant.id}`,
    label: variant.label,
    payload: { variantId: variant.id },
    swatch: variant.color
  })),
  accessory: [{ id: "free-accessory-none", label: "없음", payload: { accessoryId: "none" } }]
} satisfies Record<WardrobeTab, { id: string; label: string; payload: Record<string, string>; swatch?: string }[]>;

function inferVariantId(item: Pick<WardrobeInventoryItem, "code" | "name" | "payload">) {
  const directVariant = item.payload.variantId;

  if (CHARACTER_VARIANTS.some((variant) => variant.id === directVariant)) {
    return directVariant;
  }

  const color = item.payload.outfitColor ?? item.payload.patternColor;
  const colorVariant = CHARACTER_VARIANTS.find((variant) => variant.color.toLowerCase() === color?.toLowerCase());

  if (colorVariant) {
    return colorVariant.id;
  }

  const searchableText = `${item.code} ${item.name}`.toLowerCase();
  const matchingVariant = CHARACTER_VARIANTS.find(
    (variant) =>
      searchableText.includes(variant.id) || searchableText.includes(variant.label.toLowerCase())
  );

  return matchingVariant?.id;
}

function applyPayloadToDraft(draft: WardrobeDraft, item: Pick<WardrobeInventoryItem, "code" | "name" | "payload">) {
  return {
    ...draft,
    variantId: inferVariantId(item) ?? draft.variantId,
    accessoryId: item.payload.accessoryId ?? draft.accessoryId,
    hairId: item.payload.hairId ?? item.payload.hairStyle ?? draft.hairId,
    eyeId: item.payload.eyeId ?? draft.eyeId
  };
}

function isItemSelected(draft: WardrobeDraft, item: Pick<WardrobeInventoryItem, "code" | "name" | "payload">) {
  const nextDraft = applyPayloadToDraft(draft, item);

  return (
    nextDraft.variantId === draft.variantId &&
    nextDraft.accessoryId === draft.accessoryId &&
    nextDraft.hairId === draft.hairId &&
    nextDraft.eyeId === draft.eyeId
  );
}

export function WardrobeEditor({ character, inventoryItems }: WardrobeEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initialState = useMemo(
    () => ({
      displayName: character.displayName,
      variantId: character.customization.variantId ?? "blue",
      accessoryId: character.customization.accessoryId ?? "none",
      hairId: character.customization.hairId ?? "basic",
      eyeId: character.customization.eyeId ?? "basic"
    }),
    [character.customization, character.displayName]
  );
  const [activeTab, setActiveTab] = useState<WardrobeTab>(
    character.species === "human" ? "hair" : "eyes"
  );
  const [draft, setDraft] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const asset = getCharacterAsset(character.species, draft.variantId);
  const tabs = character.species === "human" ? humanTabs : catTabs;
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ownedItems = inventoryItems.filter((item) => item.slot === selectedTab.slot);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialState);

  function leave() {
    if (!isDirty) {
      router.push("/");
      return;
    }

    setShowLeaveModal(true);
  }

  function save() {
    const formData = new FormData();
    formData.set("displayName", draft.displayName);
    formData.set("variantId", draft.variantId);
    formData.set("accessoryId", draft.accessoryId);
    formData.set("hairId", draft.hairId);
    formData.set("eyeId", draft.eyeId);
    setIsSaving(true);

    startTransition(async () => {
      await updateWardrobe(formData);
    });
  }

  function renderItems() {
    const defaultItems = freeItems[activeTab].map((item) => ({
      id: item.id,
      label: item.label,
      payload: item.payload,
      swatch: "swatch" in item ? item.swatch : undefined,
      code: item.id,
      name: item.label,
      source: "기본"
    }));
    const purchasedItems = ownedItems.map((item) => ({
      id: item.id,
      label: item.name,
      payload: item.payload,
      swatch: item.payload.outfitColor ?? item.payload.patternColor,
      code: item.code,
      name: item.name,
      source: "보유"
    }));
    const items = [...defaultItems, ...purchasedItems];

    return (
      <>
        {items.map((item) => (
          <button
            className={`wardrobe-item ${isItemSelected(draft, item) ? "selected" : ""}`}
            key={item.id}
            type="button"
            onClick={() => setDraft((current) => applyPayloadToDraft(current, item))}
          >
            {item.swatch ? <span className="swatch" style={{ background: item.swatch }} /> : null}
            <span>{item.label}</span>
            <small>{item.source}</small>
          </button>
        ))}
      </>
    );
  }

  return (
    <section className="character-create-form">
      <div className="wardrobe-preview">
        {asset.layers ? (
          <div className="avatar-layer-stack wardrobe-avatar-stack" aria-label={`${draft.displayName} 미리보기`}>
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
            alt={`${draft.displayName} 미리보기`}
          />
        )}
        <div>
          <p className="subtle">현재 캐릭터</p>
          <input
            className="wardrobe-name-input"
            value={draft.displayName}
            maxLength={32}
            required
            onChange={(event) =>
              setDraft((current) => ({ ...current, displayName: event.target.value }))
            }
            aria-label="캐릭터 이름"
          />
          <p className="subtle">{character.species === "human" ? "인간" : "고양이"}</p>
        </div>
      </div>

      <div className="wardrobe-tabs" aria-label="옷장 탭">
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

      <div className="wardrobe-grid">{renderItems()}</div>

      <div className="form-actions">
        <button className="ghost-button" type="button" onClick={leave}>
          돌아가기
        </button>
        <button className="primary-button" type="button" onClick={save} disabled={isSaving}>
          저장
        </button>
      </div>

      {showLeaveModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true">
            <h2>변경사항을 버릴까요?</h2>
            <p className="subtle">변경한 내용이 저장되지 않았습니다. 나가시겠습니까?</p>
            <div className="form-actions">
              <button className="ghost-button" type="button" onClick={() => setShowLeaveModal(false)}>
                취소
              </button>
              <button className="primary-button" type="button" onClick={() => router.push("/")}>
                나가기
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
