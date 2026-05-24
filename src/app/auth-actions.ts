"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    throw new Error("이메일과 비밀번호를 모두 입력해 주세요.");
  }

  if (password.length < 6) {
    throw new Error("비밀번호는 6자 이상이어야 해요.");
  }

  return { email, password };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = getCredentials(formData);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}` as Route);
  }

  redirect("/" as Route);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = getCredentials(formData);
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        display_name: email.split("@")[0]
      }
    }
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}` as Route);
  }

  if (data.session) {
    await supabase.auth.signOut();
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "회원가입이 완료됐어요. 이메일 확인이 켜져 있다면 메일 인증 후 로그인해 주세요."
    )}` as Route
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login" as Route);
}
