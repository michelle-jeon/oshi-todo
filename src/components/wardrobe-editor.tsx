"use client";

import Image from "next/image";
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
};

const humanTabs = [
  { id: "hair", label: "헤어", icon: Scissors },
  { id: "eyes", label: "눈", icon: Eye },
  { id: "outfit", label: "옷", icon: Shirt },
  { id: "accessory", label: "악세서리", icon: Gem }
] as const;

const catTabs = [
  { id: "eyes", label: "눈", icon: Eye },
  { id: "pattern", label: "무늬", icon: Palette },
  { id: "accessory", label: "악세서리", icon: Gem }
] as const;

const accessoryItems = [
  { id: "none", label: "없음" },
  { id: "ribbon", label: "리본" },
  { id: "star-pin", label: "별 핀" }
];

const hairItems = [
  { id: "basic", label: "기본" },
  { id: "bob", label: "단발" },
  { id: "wave", label: "웨이브" }
];

const eyeItems = [
  { id: "basic", label: "기본" },
  { id: "bright", label: "반짝" },
  { id: "calm", label: "차분" }
];

export function WardrobeEditor({ character }: WardrobeEditorProps) {
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
    if (activeTab === "outfit" || activeTab === "pattern") {
      return CHARACTER_VARIANTS.map((variant) => (
        <button
          className={`wardrobe-item ${draft.variantId === variant.id ? "selected" : ""}`}
          key={variant.id}
          type="button"
          onClick={() => setDraft((current) => ({ ...current, variantId: variant.id }))}
        >
          <span className="swatch" style={{ background: variant.color }} />
          <span>{variant.label}</span>
        </button>
      ));
    }

    const items =
      activeTab === "accessory" ? accessoryItems : activeTab === "hair" ? hairItems : eyeItems;
    const key = activeTab === "accessory" ? "accessoryId" : activeTab === "hair" ? "hairId" : "eyeId";

    return items.map((item) => (
      <button
        className={`wardrobe-item ${draft[key] === item.id ? "selected" : ""}`}
        key={item.id}
        type="button"
        onClick={() => setDraft((current) => ({ ...current, [key]: item.id }))}
      >
        <span>{item.label}</span>
      </button>
    ));
  }

  return (
    <section className="character-create-form">
      <div className="wardrobe-preview">
        <Image src={asset.src} alt={`${draft.displayName} 미리보기`} width={512} height={512} />
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
        {(character.species === "human" ? humanTabs : catTabs).map((tab) => {
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
