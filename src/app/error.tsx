"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="simple-shell narrow">
      <section className="panel error-panel">
        <p className="subtle">OshiTodo</p>
        <h1>잠깐 연결이 흔들렸어요</h1>
        <p className="subtle">
          로그인 상태나 데이터를 확인하는 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.
        </p>
        {error.message ? <p className="auth-error">{error.message}</p> : null}
        <button className="primary-button" type="button" onClick={reset}>
          <RotateCcw size={16} /> 다시 시도
        </button>
      </section>
    </main>
  );
}
