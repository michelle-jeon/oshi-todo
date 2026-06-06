"use client";

/* eslint-disable @next/next/no-img-element */

import { Eye, Gem, Palette } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWardrobe } from "@/app/character-actions";
import { CharacterCategoryIcon } from "@/components/character-category-icon";
import { HumanItemPicker } from "@/components/human-item-picker";
import {
  CHARACTER_VARIANTS,
  HUMAN_LAYER_ITEMS,
  getCharacterAsset,
  getHumanCategory,
  getHumanDisplayCategories,
  getHumanCustomization,
  getHumanItemFromPayload,
  getHumanItemPayload,
  type CharacterSpecies,
  type HumanLayerCategory
} from "@/lib/character-assets";

type WardrobeTab = HumanLayerCategory | "pattern" | "cat-eyes" | "cat-accessory";

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

type WardrobeDraft = Record<string, string> & {
  displayName: string;
};

const catTabs = [
  { id: "cat-eyes", label: "눈", slot: "cat_eyes" },
  { id: "pattern", label: "무늬", slot: "cat_pattern" },
  { id: "cat-accessory", label: "악세서리", slot: "accessory" }
] as const;

function applyPayloadToDraft(draft: WardrobeDraft, payload: Record<string, string>) {
  return {
    ...draft,
    ...payload,
    hairId: payload.hairId ?? payload.hairStyle ?? draft.hairId,
    variantId: payload.variantId ?? draft.variantId,
    accessoryId: payload.accessoryId ?? draft.accessoryId,
    eyeId: payload.eyeId ?? draft.eyeId
  };
}

function isItemSelected(draft: WardrobeDraft, payload: Record<string, string>) {
  return Object.entries(payload).every(([key, value]) => draft[key] === value);
}

export function WardrobeEditor({ character, inventoryItems }: WardrobeEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initialState = useMemo<WardrobeDraft>(
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
  const [activeTab, setActiveTab] = useState<WardrobeTab>(
    character.species === "human" ? "body" : "cat-eyes"
  );
  const [draft, setDraft] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const asset = getCharacterAsset(character.species, draft);
  const humanCategory =
    character.species === "human"
      ? getHumanCategory(activeTab as HumanLayerCategory)
      : undefined;
  const selectedSlot =
    humanCategory?.slot ?? catTabs.find((tab) => tab.id === activeTab)?.slot ?? "cat_eyes";
  const ownedItems = inventoryItems.filter((item) => item.slot === selectedSlot);
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
    Object.entries(draft).forEach(([key, value]) => formData.set(key, value));
    setIsSaving(true);

    startTransition(async () => {
      await updateWardrobe(formData);
    });
  }

  function getDefaultItems() {
    if (character.species === "human" && humanCategory) {
      return HUMAN_LAYER_ITEMS.filter(
        (item) => item.category === humanCategory.id && item.isBasic
      ).map((item) => ({
        id: `free-${item.category}-${item.id}`,
        label: item.label,
        colorLabel: item.colorLabel,
        payload: getHumanItemPayload(item),
        swatch: item.color,
        imageSrc: item.src,
        source: "기본"
      }));
    }

    if (activeTab === "pattern") {
      return CHARACTER_VARIANTS.map((variant) => ({
        id: `free-pattern-${variant.id}`,
        label: variant.label,
        colorLabel: undefined,
        payload: { variantId: variant.id },
        swatch: variant.color,
        imageSrc: variant.cat,
        source: "기본"
      }));
    }

    if (activeTab === "cat-eyes") {
      return [
        {
          id: "free-cat-eyes-basic",
          label: "기본 눈",
          colorLabel: undefined,
          payload: { eyeId: "basic" },
          swatch: undefined,
          imageSrc: asset.src,
          source: "기본"
        }
      ];
    }

    return [
      {
        id: "free-cat-accessory-none",
        label: "없음",
        colorLabel: undefined,
        payload: { accessoryId: "none" },
        swatch: undefined,
        imageSrc: asset.src,
        source: "기본"
      }
    ];
  }

  const items = [
    ...getDefaultItems(),
    ...ownedItems.map((item) => ({
      id: item.id,
      label: item.name,
      colorLabel: undefined,
      payload: item.payload,
      swatch: item.payload.color,
      imageSrc: getHumanItemFromPayload(item.payload)?.src ?? asset.src,
      source: "보유"
    }))
  ];

  return (
    <section className="character-create-form">
      <div className="wardrobe-preview">
        {asset.layers ? (
          <div className="avatar-layer-stack wardrobe-avatar-stack" aria-label={`${draft.displayName} 미리보기`}>
            {asset.layers.map((layer) => (
              <img className="avatar-layer" key={layer.id} src={layer.src} alt={layer.alt} />
            ))}
          </div>
        ) : (
          <img className="avatar-image" src={asset.src} alt={`${draft.displayName} 미리보기`} />
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
        {character.species === "human"
          ? getHumanDisplayCategories().map((category) => (
              <button
                className={activeTab === category.id ? "selected" : ""}
                key={category.id}
                type="button"
                onClick={() => setActiveTab(category.id)}
                aria-label={category.label}
                title={category.label}
              >
                <CharacterCategoryIcon category={category.id} />
              </button>
            ))
          : catTabs.map((tab) => (
              <button
                className={activeTab === tab.id ? "selected" : ""}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                title={tab.label}
              >
                {tab.id === "pattern" ? <Palette size={20} /> : tab.id === "cat-eyes" ? <Eye size={20} /> : <Gem size={20} />}
              </button>
            ))}
      </div>

      {character.species === "human" && humanCategory ? (
        <HumanItemPicker
          category={humanCategory.id}
          items={[
            ...HUMAN_LAYER_ITEMS.filter(
              (item) => item.category === humanCategory.id && item.isBasic
            ),
            ...ownedItems.flatMap((item) => {
              const catalogItem = getHumanItemFromPayload(item.payload);
              return catalogItem ? [catalogItem] : [];
            })
          ].filter(
            (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index
          )}
          selectedItemId={draft[humanCategory.customizationKey]}
          onSelect={(item) =>
            setDraft((current) => applyPayloadToDraft(current, getHumanItemPayload(item)))
          }
          sourceLabel="기본/보유"
        />
      ) : (
        <div className="wardrobe-grid character-item-grid">
          {items.map((item) => (
            <button
              className={`wardrobe-item character-item-card ${isItemSelected(draft, item.payload) ? "selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => setDraft((current) => applyPayloadToDraft(current, item.payload))}
            >
              <span className="character-item-image">
                <img src={item.imageSrc} alt="" />
              </span>
              <span>{item.label}</span>
              <small>{item.source}</small>
            </button>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button className="ghost-button" type="button" onClick={leave}>
          돌아가기
        </button>
        <button className="primary-button" type="button" onClick={save} disabled={isSaving || !isDirty}>
          {isSaving ? "저장 중" : "저장"}
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
