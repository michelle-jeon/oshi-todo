"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createRoutine(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const frequency = String(formData.get("frequency") ?? "daily") === "weekly" ? "weekly" : "daily";
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  if (!title) {
    redirect("/?message=루틴 이름을 입력해 주세요." as Route);
  }

  const { data, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      title,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : []
    })
    .select("id, title, frequency, weekdays, xp_reward, is_active")
    .single();

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
  return data;
}

export async function deleteRoutine(routineId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", routineId);

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}
