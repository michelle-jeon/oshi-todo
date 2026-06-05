"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import {
  isLegacyStarterCharacter,
  MAX_CHARACTER_SLOTS
} from "@/lib/character-onboarding";
import { CHARACTER_VARIANTS, type CharacterSpecies } from "@/lib/character-assets";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type InventoryShopItem = {
  slot: string;
  species: CharacterSpecies | null;
  payload: Record<string, string>;
};

type InventoryRow = {
  shop_items: InventoryShopItem | InventoryShopItem[] | null;
};

type WardrobeSelection = {
  variantId: string;
  hairId: string;
  eyeId: string;
  accessoryId: string;
};

function createCharacterPath(formData: FormData, message: string): Route {
  const source = String(formData.get("source") ?? "");
  const params = new URLSearchParams({ message });

  if (source === "characters") {
    params.set("from", "characters");
  }

  return `/characters/new?${params.toString()}` as Route;
}

function readSpecies(formData: FormData): CharacterSpecies {
  const species = String(formData.get("species") ?? "");

  if (species === "human" || species === "cat") {
    return species;
  }

  redirect(createCharacterPath(formData, "캐릭터 종류를 선택해 주세요."));
}

function readVariant(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const variant = CHARACTER_VARIANTS.find((candidate) => candidate.id === variantId);

  if (!variant) {
    redirect(createCharacterPath(formData, "색상을 선택해 주세요."));
  }

  return variant;
}

function readDisplayName(formData: FormData, fallback?: string) {
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 32);

  if (!displayName && !fallback) {
    redirect(createCharacterPath(formData, "캐릭터 이름을 입력해 주세요."));
  }

  return displayName || fallback || "이름 없는 캐릭터";
}

function readWardrobeSelection(formData: FormData): WardrobeSelection {
  return {
    variantId: String(formData.get("variantId") ?? "blue"),
    hairId: String(formData.get("hairId") ?? "basic"),
    eyeId: String(formData.get("eyeId") ?? "basic"),
    accessoryId: String(formData.get("accessoryId") ?? "none")
  };
}

function getOwnedSlotValues(
  inventoryItems: InventoryShopItem[],
  species: CharacterSpecies,
  slot: string,
  payloadKeys: string[]
) {
  const values = new Set<string>();

  inventoryItems
    .filter((item) => item.slot === slot && (item.species === null || item.species === species))
    .forEach((item) => {
      payloadKeys.forEach((key) => {
        const value = item.payload[key];

        if (value) {
          values.add(value);
        }
      });
    });

  return values;
}

function isWardrobeSelectionAllowed(
  species: CharacterSpecies,
  selection: WardrobeSelection,
  inventoryItems: InventoryShopItem[]
) {
  const variant = CHARACTER_VARIANTS.some((candidate) => candidate.id === selection.variantId);

  if (!variant) {
    return false;
  }

  const hairValues = getOwnedSlotValues(inventoryItems, species, "human_hair", ["hairId", "hairStyle"]);
  const eyeValues = getOwnedSlotValues(
    inventoryItems,
    species,
    species === "human" ? "human_eyes" : "cat_eyes",
    ["eyeId"]
  );
  const accessoryValues = getOwnedSlotValues(inventoryItems, species, "accessory", ["accessoryId"]);

  const hairAllowed =
    species === "cat" || selection.hairId === "basic" || hairValues.has(selection.hairId);
  const eyeAllowed = selection.eyeId === "basic" || eyeValues.has(selection.eyeId);
  const accessoryAllowed =
    selection.accessoryId === "none" || accessoryValues.has(selection.accessoryId);

  return hairAllowed && eyeAllowed && accessoryAllowed;
}

export async function createCharacter(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const species = readSpecies(formData);
  const variant = readVariant(formData);
  const displayName = readDisplayName(formData);

  const [{ count }, { data: activeCharacter }] = await Promise.all([
    supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("characters")
      .select("id, display_name, customization")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle<{
        id: string;
        display_name: string;
        customization: Record<string, string>;
      }>()
  ]);

  if ((count ?? 0) >= MAX_CHARACTER_SLOTS && !isLegacyStarterCharacter(activeCharacter)) {
    redirect("/characters?message=캐릭터 슬롯이 모두 찼어요." as Route);
  }

  const customization =
    species === "human"
      ? {
          species,
          variantId: variant.id,
          outfitColor: variant.color,
          hairColor: "#5f3d2e",
          hairId: "basic",
          eyeId: "basic",
          accessoryId: "none"
        }
      : {
          species,
          variantId: variant.id,
          furColor: "#f4d0a1",
          patternColor: variant.color,
          hairId: "basic",
          eyeId: "basic",
          accessoryId: "none"
        };

  if (activeCharacter && isLegacyStarterCharacter(activeCharacter)) {
    const { error } = await supabase
      .from("characters")
      .update({
        display_name: displayName,
        species,
        is_active: true,
        customization
      })
      .eq("id", activeCharacter.id)
      .eq("user_id", user.id);

    if (error) {
      redirect(createCharacterPath(formData, error.message));
    }

    revalidatePath("/");
    revalidatePath("/characters");
    redirect("/");
  }

  await supabase
    .from("characters")
    .update({ is_active: false })
    .eq("user_id", user.id);

  const { error } = await supabase.from("characters").insert({
    user_id: user.id,
    display_name: displayName,
    species,
    is_active: true,
    customization
  });

  if (error) {
    redirect(createCharacterPath(formData, error.message));
  }

  revalidatePath("/");
  revalidatePath("/characters");
  redirect("/");
}

export async function selectCharacter(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/characters?message=캐릭터를 선택해 주세요." as Route);
  }

  await supabase
    .from("characters")
    .update({ is_active: false })
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("characters")
    .update({ is_active: true })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/characters?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
  revalidatePath("/characters");
  redirect("/");
}

export async function updateWardrobe(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const variant = readVariant(formData);
  const displayName = readDisplayName(formData, "이름 없는 캐릭터");
  const selection = readWardrobeSelection(formData);

  const { data: activeCharacter, error: characterError } = await supabase
    .from("characters")
    .select("id, species")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<{ id: string; species: CharacterSpecies }>();

  if (characterError || !activeCharacter) {
    redirect("/characters/new?message=먼저 캐릭터를 생성해 주세요." as Route);
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("character_inventory")
    .select("shop_items(slot, species, payload)")
    .eq("character_id", activeCharacter.id)
    .returns<InventoryRow[]>();

  if (inventoryError) {
    redirect(`/characters/wardrobe?message=${encodeURIComponent(inventoryError.message)}` as Route);
  }

  const inventoryItems = (inventory ?? []).flatMap((row) => row.shop_items ?? []);

  if (!isWardrobeSelectionAllowed(activeCharacter.species, selection, inventoryItems)) {
    redirect("/characters/wardrobe?message=보유하지 않은 아이템은 장착할 수 없어요." as Route);
  }

  const customization =
    activeCharacter.species === "human"
      ? {
          species: activeCharacter.species,
          variantId: variant.id,
          outfitColor: variant.color,
          hairColor: "#5f3d2e",
          hairId: selection.hairId,
          eyeId: selection.eyeId,
          accessoryId: selection.accessoryId
        }
      : {
          species: activeCharacter.species,
          variantId: variant.id,
          furColor: "#f4d0a1",
          patternColor: variant.color,
          hairId: selection.hairId,
          eyeId: selection.eyeId,
          accessoryId: selection.accessoryId
        };

  const { error } = await supabase
    .from("characters")
    .update({
      display_name: displayName,
      customization
    })
    .eq("id", activeCharacter.id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/characters/wardrobe?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
  revalidatePath("/characters/wardrobe");
  redirect("/?message=옷장이 저장됐어요." as Route);
}
