"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createPlazaRoom(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const visibility = String(formData.get("visibility") ?? "private") === "public" ? "public" : "private";

  if (name.length < 2) {
    redirect("/plaza?message=광장 이름은 두 글자 이상이어야 해요." as Route);
  }

  const { data, error } = await supabase
    .from("plaza_rooms")
    .insert({
      owner_id: user.id,
      name,
      visibility
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    redirect(`/plaza?message=${encodeURIComponent(error?.message ?? "광장을 만들 수 없어요.")}` as Route);
  }

  redirect(`/plaza/${data.id}` as Route);
}
