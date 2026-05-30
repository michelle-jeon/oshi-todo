"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
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
  }
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleAuthButton() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setErrorMessage("Google 로그인 응답을 받지 못했어요. 다시 시도해 주세요.");
        return;
      }

      setErrorMessage(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/");
      router.refresh();
    },
    [router]
  );

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !googleClientId) {
      return;
    }

    const googleAccounts = window.google?.accounts;

    if (!googleAccounts) {
      return;
    }

    buttonRef.current.innerHTML = "";
    googleAccounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredential
    });
    googleAccounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 320
    });
  }, [handleCredential, scriptReady]);

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
        onError={() => setErrorMessage("Google 로그인 스크립트를 불러오지 못했어요.")}
      />
      <div className="google-button-host" ref={buttonRef} aria-live="polite" />
      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
    </>
  );
}
