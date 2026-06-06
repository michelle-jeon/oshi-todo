"use client";

/* eslint-disable @next/next/no-img-element */

import { Cat, Palette, UserRound } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createCharacter } from "@/app/character-actions";
import { CharacterCategoryIcon } from "@/components/character-category-icon";
import { HumanItemPicker } from "@/components/human-item-picker";
import {
  CHARACTER_VARIANTS,
  getDefaultHumanCustomization,
  getCharacterAsset,
  getHumanCategory,
  getHumanCategoryItems,
  getHumanDisplayCategories,
  type HumanLayerCategory,
  type CharacterVariantId,
  type CharacterSpecies
} from "@/lib/character-assets";

type WizardStep = "species" | "customize" | "name";
type CustomizeTab = HumanLayerCategory | "pattern";

const speciesOptions = [
  { id: "human", label: "인간", icon: UserRound },
  { id: "cat", label: "고양이", icon: Cat }
] as const;

type CharacterCreateWizardProps = {
  source?: "characters" | "onboarding";
};

export function CharacterCreateWizard({ source = "onboarding" }: CharacterCreateWizardProps) {
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>("species");
  const [species, setSpecies] = useState<CharacterSpecies | null>(null);
  const [variantId, setVariantId] = useState<CharacterVariantId>(CHARACTER_VARIANTS[0].id);
  const [humanCustomization, setHumanCustomization] = useState(getDefaultHumanCustomization);
  const [activeTab, setActiveTab] = useState<CustomizeTab>("body");
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const asset = useMemo(
    () => (species ? getCharacterAsset(species, species === "human" ? humanCustomization : variantId) : null),
    [humanCustomization, species, variantId]
  );
  const tabs = species === "human" ? getHumanDisplayCategories() : [{ id: "pattern", label: "무늬" } as const];

  function chooseSpecies(nextSpecies: CharacterSpecies) {
    setSpecies(nextSpecies);
    setActiveTab(nextSpecies === "cat" ? "pattern" : "body");
    setStep("customize");
  }

  function finish() {
    if (!species || !displayName.trim()) {
      return;
    }

    const formData = new FormData();
    formData.set("species", species);
    formData.set("variantId", variantId);
    Object.entries(humanCustomization).forEach(([key, value]) => formData.set(key, value));
    formData.set("displayName", displayName.trim());
    formData.set("source", source);
    setIsSaving(true);

    startTransition(async () => {
      await createCharacter(formData);
    });
  }

  if (step === "species") {
    return (
      <section className="character-wizard species-step">
        <div className="species-pick-grid">
          {speciesOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                className="species-pick-card"
                key={option.id}
                type="button"
                onClick={() => chooseSpecies(option.id)}
              >
                <Icon size={34} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`character-wizard ${step === "name" ? "naming-open" : ""}`}>
      <div className="wizard-preview-pane">
        {asset?.layers ? (
          <div
            className="avatar-layer-stack wizard-avatar-stack"
            aria-label={`인간 캐릭터 ${asset.label}`}
          >
            {asset.layers.map((layer) => (
              <img
                className="avatar-layer"
                key={layer.id}
                src={layer.src}
                alt={layer.alt}
              />
            ))}
          </div>
        ) : asset ? (
          <img
            className="wizard-character-image"
            src={asset.src}
            alt={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label}`}
          />
        ) : null}
      </div>

      <div className="wizard-side-stack">
        <section className="wizard-customize-pane">
          <div className="wardrobe-tabs" aria-label="커스터마이징 탭">
            {tabs.map((tab) => {
              return (
                <button
                  className={activeTab === tab.id ? "selected" : ""}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  {tab.id === "pattern" ? (
                    <Palette size={20} />
                  ) : (
                    <CharacterCategoryIcon category={tab.id} />
                  )}
                </button>
              );
            })}
          </div>

          {species === "cat" ? (
            <div className="wardrobe-grid">
              {CHARACTER_VARIANTS.map((variant) => (
                <button
                  className={`wardrobe-item character-item-card ${variantId === variant.id ? "selected" : ""}`}
                  key={variant.id}
                  type="button"
                  onClick={() => setVariantId(variant.id)}
                >
                  <span className="character-item-image">
                    <img src={variant.cat} alt="" />
                  </span>
                  <span>{variant.label} 무늬</span>
                </button>
              ))}
            </div>
          ) : (
            <HumanItemPicker
              category={activeTab as HumanLayerCategory}
              items={getHumanCategoryItems(activeTab as HumanLayerCategory)}
              selectedItemId={
                humanCustomization[
                  getHumanCategory(activeTab as HumanLayerCategory)?.customizationKey ?? "bodyId"
                ]
              }
              onSelect={(item) => {
                const category = getHumanCategory(item.category);

                if (category) {
                  setHumanCustomization((current) => ({
                    ...current,
                    [category.customizationKey]: item.id
                  }));
                }
              }}
            />
          )}

          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={() => setStep("species")}>
              이전
            </button>
            <button className="primary-button" type="button" onClick={() => setStep("name")}>
              완료
            </button>
          </div>
        </section>

        <section className="wizard-name-pane">
          <label>
            캐릭터 이름
            <input
              value={displayName}
              placeholder="이름을 입력해 주세요"
              maxLength={32}
              autoFocus={step === "name"}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={() => setStep("customize")}>
              이전
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!displayName.trim() || isSaving}
              onClick={finish}
            >
              시작하기
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
