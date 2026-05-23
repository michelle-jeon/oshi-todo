"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function purchaseShopItem(shopItemId: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("purchase_shop_item", {
    shop_item_id_input: shopItemId
  });

  if (error) {
    redirect(`/shop?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
  revalidatePath("/shop");
}
