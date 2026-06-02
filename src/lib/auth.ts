import { redirect } from "next/navigation";
import type { Route } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function isMissingSessionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { message, name } = error as { message?: string; name?: string };

  return name === "AuthSessionMissingError" || message === "Auth session missing!";
}

async function hasSupabaseAuthCookie() {
  const cookieStore = await cookies();

  return cookieStore.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

export async function getCurrentUser() {
  if (!(await hasSupabaseAuthCookie())) {
    return null;
  }

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
  if (!(await hasSupabaseAuthCookie())) {
    redirect("/login" as Route);
  }

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
