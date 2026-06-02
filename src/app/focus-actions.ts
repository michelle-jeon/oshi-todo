"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function isMissingFocusLogSchema(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    error.message?.includes("record_focus_window_progress") ||
    error.message?.includes("focus_window_logs")
  );
}

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

export async function recordFocusProgress(input: {
  windowKey: string;
  displayName: string;
  fullName: string;
  secondsDelta: number;
  xpDelta: number;
  workDate: string;
}) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("record_focus_window_progress", {
    window_key_input: input.windowKey,
    display_name_input: input.displayName,
    full_name_input: input.fullName,
    seconds_delta_input: input.secondsDelta,
    xp_delta_input: input.xpDelta,
    work_date_input: input.workDate
  });

  if (error) {
    if (isMissingFocusLogSchema(error)) {
      return;
    }

    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}
