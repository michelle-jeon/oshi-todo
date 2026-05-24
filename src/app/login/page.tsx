import { redirect } from "next/navigation";
import type { Route } from "next";
import { signIn, signUp } from "@/app/auth-actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";
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
          <p className="subtle">OshiTodo</p>
          <h1 className="brand">로그인</h1>
          <p className="subtle">투두를 완료하고 선택한 캐릭터에게 경험치를 쌓아주세요.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <div className="auth-grid">
          <form className="auth-form" action={signIn}>
            <h2>기존 계정</h2>
            <label>
              이메일
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              비밀번호
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={6}
                required
              />
            </label>
            <AuthSubmitButton className="primary-button" pendingText="로그인 중...">
              로그인
            </AuthSubmitButton>
          </form>

          <form className="auth-form" action={signUp}>
            <h2>새 계정</h2>
            <label>
              이메일
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              비밀번호
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <AuthSubmitButton className="ghost-button" pendingText="가입 요청 중...">
              회원가입
            </AuthSubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
