"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const VALID_SLOTS = new Set([
  "human_body",
  "human_shoes",
  "human_bottom",
  "human_top",
  "human_hair",
  "human_mouth",
  "human_eyes",
  "human_outfit",
  "cat_pattern",
  "cat_eyes",
  "accessory",
  "room_item",
  "mount"
]);

const VALID_UNLOCK_METHODS = new Set(["gem", "attendance", "focus"]);

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) ? Math.max(Math.floor(value), 0) : 0;
}

function readPayload(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "{}").trim() || "{}";
  const value = JSON.parse(raw) as unknown;

  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("착용 payload는 JSON 객체여야 해요.");
  }

  return value as Record<string, string>;
}

function toIso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export async function saveCatalogItem(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const itemId = optionalText(formData, "itemId");
  const { data: existingItem, error: existingItemError } = itemId
    ? await supabase
        .from("shop_items")
        .select("is_basic, code")
        .eq("id", itemId)
        .single<{ is_basic: boolean; code: string }>()
    : { data: null, error: null };
  const isBasic = existingItem?.is_basic ?? false;
  const code = existingItem?.is_basic
    ? existingItem.code
    : String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const unlockMethod = String(formData.get("unlockMethod") ?? "gem");
  const enabledSpecies = ["human", "cat"].filter(
    (species) => formData.get(`${species}Enabled`) === "on"
  );

  if (existingItemError) {
    redirect(`/admin?message=${encodeURIComponent(existingItemError.message)}` as Route);
  }

  if (!code || !name || !VALID_UNLOCK_METHODS.has(unlockMethod)) {
    redirect("/admin?message=상품 코드, 이름, 획득 방식을 확인해 주세요." as Route);
  }

  if (enabledSpecies.length === 0) {
    redirect("/admin?message=착용 가능한 종족을 하나 이상 선택해 주세요." as Route);
  }

  try {
    const variants = enabledSpecies.map((species) => {
      const slot = String(formData.get(`${species}Slot`) ?? "");

      if (!VALID_SLOTS.has(slot)) {
        throw new Error(`${species === "human" ? "인간" : "고양이"} 슬롯을 확인해 주세요.`);
      }

      return {
        species,
        slot,
        payload: readPayload(formData, `${species}Payload`),
        layer_asset_url: optionalText(formData, `${species}LayerAssetUrl`)
      };
    });
    const primaryVariant = variants[0];
    const itemValues = {
      code,
      name,
      description: optionalText(formData, "description"),
      thumbnail_url: optionalText(formData, "thumbnailUrl"),
      unlock_method: isBasic ? "gem" : unlockMethod,
      unlock_requirement: readNumber(formData, "unlockRequirement"),
      cost: isBasic ? 0 : unlockMethod === "gem" ? readNumber(formData, "cost") : 0,
      available_from: toIso(optionalText(formData, "availableFrom")),
      available_until: toIso(optionalText(formData, "availableUntil")),
      is_active: formData.get("isActive") === "on",
      species: variants.length === 1 ? primaryVariant.species : null,
      slot: primaryVariant.slot,
      payload: primaryVariant.payload
    };
    const itemResult = itemId
      ? await supabase.from("shop_items").update(itemValues).eq("id", itemId).select("id").single()
      : await supabase.from("shop_items").insert(itemValues).select("id").single();

    if (itemResult.error || !itemResult.data) {
      throw new Error(itemResult.error?.message ?? "상품을 저장하지 못했어요.");
    }

    const savedItemId = itemResult.data.id as string;
    const { error: deleteError } = await supabase
      .from("shop_item_variants")
      .delete()
      .eq("shop_item_id", savedItemId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: variantError } = await supabase.from("shop_item_variants").insert(
      variants.map((variant) => ({
        shop_item_id: savedItemId,
        ...variant
      }))
    );

    if (variantError) {
      throw new Error(variantError.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "상품 저장 중 오류가 발생했어요.";
    redirect(`/admin?message=${encodeURIComponent(message)}` as Route);
  }

  revalidatePath("/admin");
  revalidatePath("/shop");
  redirect("/admin?message=상품을 저장했어요." as Route);
}

export async function toggleCatalogItem(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const itemId = String(formData.get("itemId") ?? "");
  const isActive = formData.get("isActive") === "true";

  const { error } = await supabase
    .from("shop_items")
    .update({ is_active: !isActive })
    .eq("id", itemId);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/admin");
  revalidatePath("/shop");
}

export async function deleteCatalogItem(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const itemId = String(formData.get("itemId") ?? "");
  const { data: item, error: itemError } = await supabase
    .from("shop_items")
    .select("is_basic")
    .eq("id", itemId)
    .single<{ is_basic: boolean }>();

  if (itemError) {
    redirect(`/admin?message=${encodeURIComponent(itemError.message)}` as Route);
  }

  if (item.is_basic) {
    redirect("/admin?message=코드에 포함된 기본 제공 아이템은 삭제할 수 없어요." as Route);
  }

  const { count, error: countError } = await supabase
    .from("character_inventory")
    .select("shop_item_id", { count: "exact", head: true })
    .eq("shop_item_id", itemId);

  if (countError) {
    redirect(`/admin?message=${encodeURIComponent(countError.message)}` as Route);
  }

  if ((count ?? 0) > 0) {
    redirect("/admin?message=보유 중인 사용자가 있는 상품은 삭제할 수 없어요. 상점에서 내려 주세요." as Route);
  }

  const { error } = await supabase.from("shop_items").delete().eq("id", itemId);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/admin");
  revalidatePath("/shop");
  redirect("/admin?message=상품을 삭제했어요." as Route);
}

export async function moveCatalogItem(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const itemId = String(formData.get("itemId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const { data: items, error } = await supabase
    .from("shop_items")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Array<{ id: string; sort_order: number }>>();

  if (error) {
    redirect(`/admin?message=${encodeURIComponent(error.message)}` as Route);
  }

  const currentIndex = (items ?? []).findIndex((item) => item.id === itemId);
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= (items ?? []).length) {
    return;
  }

  const current = items![currentIndex];
  const next = items![nextIndex];
  const [{ error: currentError }, { error: nextError }] = await Promise.all([
    supabase.from("shop_items").update({ sort_order: next.sort_order }).eq("id", current.id),
    supabase.from("shop_items").update({ sort_order: current.sort_order }).eq("id", next.id)
  ]);

  if (currentError || nextError) {
    redirect(`/admin?message=${encodeURIComponent(currentError?.message ?? nextError?.message ?? "정렬을 변경하지 못했어요.")}` as Route);
  }

  revalidatePath("/admin");
  revalidatePath("/shop");
}
