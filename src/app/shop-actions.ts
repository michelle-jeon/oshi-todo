"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getPurchaseErrorMessage(message: string) {
  if (message.includes("Not enough XP")) {
    return "사용 가능 젬이 부족해요.";
  }

  if (message.includes("Item already purchased")) {
    return "이미 구매한 아이템이에요.";
  }

  if (message.includes("Shop item not found")) {
    return "구매할 수 없는 아이템이에요.";
  }

  if (message.includes("Active character not found")) {
    return "활성 캐릭터를 찾을 수 없어요.";
  }

  if (message.includes("active character species")) {
    return "현재 캐릭터가 착용할 수 없는 아이템이에요.";
  }

  return message;
}

export async function purchaseShopItem(shopItemId: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("purchase_shop_item", {
    shop_item_id_input: shopItemId
  });

  if (error) {
    redirect(`/shop?message=${encodeURIComponent(getPurchaseErrorMessage(error.message))}` as Route);
  }

  revalidatePath("/");
  revalidatePath("/shop");
}

export async function purchaseShopItems(shopItemIds: string[]) {
  await requireUser();
  const supabase = await createClient();
  const uniqueItemIds = Array.from(new Set(shopItemIds.filter(Boolean)));

  if (uniqueItemIds.length === 0) {
    redirect("/shop?message=구매할 아이템을 선택해 주세요." as Route);
  }

  for (const shopItemId of uniqueItemIds) {
    const { error } = await supabase.rpc("purchase_shop_item", {
      shop_item_id_input: shopItemId
    });

    if (error) {
      redirect(`/shop?message=${encodeURIComponent(getPurchaseErrorMessage(error.message))}` as Route);
    }
  }

  revalidatePath("/");
  revalidatePath("/shop");
  redirect("/shop?message=선택한 아이템을 구매했어요." as Route);
}
