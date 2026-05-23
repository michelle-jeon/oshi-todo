"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { CHARACTER_VARIANTS, type CharacterSpecies } from "@/lib/character-assets";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function readSpecies(formData: FormData): CharacterSpecies {
  const species = String(formData.get("species") ?? "");

  if (species === "human" || species === "cat") {
    return species;
  }

  redirect("/characters/new?message=캐릭터 종류를 선택해 주세요." as Route);
}

function readVariant(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const variant = CHARACTER_VARIANTS.find((candidate) => candidate.id === variantId);

  if (!variant) {
    redirect("/characters/new?message=색상을 선택해 주세요." as Route);
  }

  return variant;
}

function readDisplayName(formData: FormData, fallback?: string) {
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 32);

  if (!displayName && !fallback) {
    redirect("/characters/new?message=캐릭터 이름을 입력해 주세요." as Route);
  }

  return displayName || fallback || "이름 없는 캐릭터";
}

export async function createCharacter(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const species = readSpecies(formData);
  const variant = readVariant(formData);
  const displayName = readDisplayName(formData);

  const { count } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 1) {
    redirect("/?message=현재 MVP에서는 캐릭터를 하나만 생성할 수 있어요." as Route);
  }

  const customization =
    species === "human"
      ? {
          species,
          variantId: variant.id,
          outfitColor: variant.color,
          hairColor: "#5f3d2e"
        }
      : {
          species,
          variantId: variant.id,
          furColor: "#f4d0a1",
          patternColor: variant.color
        };

  const { error } = await supabase.from("characters").insert({
    user_id: user.id,
    display_name: displayName,
    species,
    is_active: true,
    customization
  });

  if (error) {
    redirect(`/characters/new?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateWardrobe(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const variant = readVariant(formData);
  const displayName = readDisplayName(formData, "이름 없는 캐릭터");

  const { data: activeCharacter, error: characterError } = await supabase
    .from("characters")
    .select("id, species")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<{ id: string; species: CharacterSpecies }>();

  if (characterError || !activeCharacter) {
    redirect("/characters/new?message=먼저 캐릭터를 생성해 주세요." as Route);
  }

  const customization =
    activeCharacter.species === "human"
      ? {
          species: activeCharacter.species,
          variantId: variant.id,
          outfitColor: variant.color,
          hairColor: "#5f3d2e"
        }
      : {
          species: activeCharacter.species,
          variantId: variant.id,
          furColor: "#f4d0a1",
          patternColor: variant.color
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
