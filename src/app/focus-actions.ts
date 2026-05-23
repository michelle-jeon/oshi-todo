"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function awardFocusXp(amount: number) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("award_focus_xp", {
    amount_input: amount
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}
