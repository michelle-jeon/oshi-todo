"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonConfig = {
  theme: "outline";
  size: "large";
  text: "continue_with";
  shape: "rectangular";
  width: number;
};

type GoogleAccounts = {
  id: {
    initialize(config: {
      client_id: string;
      callback(response: GoogleCredentialResponse): void;
    }): void;
    renderButton(element: HTMLElement, config: GoogleButtonConfig): void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
    __oshiGoogleCredentialHandler?: (response: GoogleCredentialResponse) => void;
    __oshiGoogleInitializedClientId?: string;
  }
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleAuthButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedButtonRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.google?.accounts)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setErrorMessage("Google 로그인 응답을 받지 못했어요. 다시 시도해 주세요.");
        setIsSigningIn(false);
        return;
      }

      setErrorMessage(null);
      setIsSigningIn(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSigningIn(false);
        return;
      }

      window.location.replace("/");
    },
    []
  );

  useEffect(() => {
    window.__oshiGoogleCredentialHandler = handleCredential;
  }, [handleCredential]);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !googleClientId) {
      return;
    }

    const googleAccounts = window.google?.accounts;

    if (!googleAccounts) {
      return;
    }

    if (window.__oshiGoogleInitializedClientId !== googleClientId) {
      googleAccounts.id.initialize({
        client_id: googleClientId,
        callback(response) {
          window.__oshiGoogleCredentialHandler?.(response);
        }
      });
      window.__oshiGoogleInitializedClientId = googleClientId;
    }

    if (renderedButtonRef.current) {
      return;
    }

    buttonRef.current.innerHTML = "";
    googleAccounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 320
    });
    renderedButtonRef.current = true;
  }, [scriptReady]);

  if (!googleClientId) {
    return (
      <p className="notice">
        Google Client ID가 설정되지 않았어요. .env.local에 NEXT_PUBLIC_GOOGLE_CLIENT_ID를 추가해
        주세요.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => setErrorMessage("Google 로그인 스크립트를 불러오지 못했어요.")}
      />
      {!scriptReady ? (
        <button className="google-fallback-button" type="button" disabled>
          Google 로그인 준비 중...
        </button>
      ) : null}
      <div className="google-button-host" ref={buttonRef} aria-live="polite" />
      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
      {isSigningIn ? (
        <div className="login-splash" role="status" aria-live="polite">
          <div className="login-splash-logo-slot" aria-label="OshiTodo 로딩">
            OshiTodo
          </div>
        </div>
      ) : null}
    </>
  );
}
