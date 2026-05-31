"use client";

import Image from "next/image";
import { Cat, Check, Eye, Gem, Scissors, Shirt, UserRound } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createCharacter } from "@/app/character-actions";
import {
  CHARACTER_VARIANTS,
  getCharacterAsset,
  type CharacterVariantId,
  type CharacterSpecies
} from "@/lib/character-assets";

type WizardStep = "species" | "customize" | "name";
type CustomizeTab = "outfit" | "hair" | "eyes" | "accessory";

const speciesOptions = [
  { id: "human", label: "인간", icon: UserRound },
  { id: "cat", label: "고양이", icon: Cat }
] as const;

const tabs = [
  { id: "outfit", label: "옷", icon: Shirt },
  { id: "hair", label: "헤어", icon: Scissors },
  { id: "eyes", label: "눈", icon: Eye },
  { id: "accessory", label: "악세서리", icon: Gem }
] as const;

const comingSoonItems = {
  hair: ["기본 헤어"],
  eyes: ["기본 눈"],
  accessory: ["없음"]
};

export function CharacterCreateWizard() {
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>("species");
  const [species, setSpecies] = useState<CharacterSpecies | null>(null);
  const [variantId, setVariantId] = useState<CharacterVariantId>(CHARACTER_VARIANTS[0].id);
  const [activeTab, setActiveTab] = useState<CustomizeTab>("outfit");
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const asset = useMemo(
    () => (species ? getCharacterAsset(species, variantId) : null),
    [species, variantId]
  );

  function chooseSpecies(nextSpecies: CharacterSpecies) {
    setSpecies(nextSpecies);
    setActiveTab(nextSpecies === "cat" ? "outfit" : "outfit");
    setStep("customize");
  }

  function finish() {
    if (!species || !displayName.trim()) {
      return;
    }

    const formData = new FormData();
    formData.set("species", species);
    formData.set("variantId", variantId);
    formData.set("displayName", displayName.trim());
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
        {asset ? (
          <Image
            className="wizard-character-image"
            src={asset.src}
            alt={`${species === "human" ? "인간" : "고양이"} 캐릭터 ${asset.label}`}
            width={512}
            height={512}
            priority
          />
        ) : null}
      </div>

      <div className="wizard-side-stack">
        <section className="wizard-customize-pane">
          <div className="wardrobe-tabs" aria-label="커스터마이징 탭">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={activeTab === tab.id ? "selected" : ""}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>

          {activeTab === "outfit" ? (
            <div className="wardrobe-grid">
              {CHARACTER_VARIANTS.map((variant) => (
                <button
                  className={`wardrobe-item ${variantId === variant.id ? "selected" : ""}`}
                  key={variant.id}
                  type="button"
                  onClick={() => setVariantId(variant.id)}
                >
                  <span className="swatch" style={{ background: variant.color }} />
                  <span>{species === "cat" ? `${variant.label} 무늬` : `${variant.label} 옷`}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="wardrobe-grid">
              {comingSoonItems[activeTab].map((item) => (
                <button className="wardrobe-item selected" key={item} type="button">
                  <Check size={18} />
                  <span>{item}</span>
                </button>
              ))}
            </div>
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
