import { redirect } from "next/navigation";
import type { Route } from "next";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { EnvironmentBrand } from "@/components/environment-brand";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { message } = await searchParams;

  if (user) {
    redirect("/" as Route);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <p className="subtle"><EnvironmentBrand /></p>
          <h1 className="brand">가입 또는 로그인</h1>
          <p className="subtle">Google 계정으로 바로 시작하고, 투두 완료 경험치를 쌓아주세요.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <div className="oauth-panel">
          <GoogleAuthButton />
          <p className="subtle">
            OshiTodo는 지금 Google 계정으로만 가입하고 로그인합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
