import { redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";

function isMissingSessionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { message, name } = error as { message?: string; name?: string };

  return name === "AuthSessionMissingError" || message === "Auth session missing!";
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error && !isMissingSessionError(error)) {
    throw new Error("로그인 상태를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  }

  if (isMissingSessionError(error) || !user) {
    redirect("/login" as Route);
  }

  return user;
}
