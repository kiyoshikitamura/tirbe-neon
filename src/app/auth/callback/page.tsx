"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { getOAuthReturnUrl } from "@/utils/browserDetection";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let redirected = false;
    let callbackExchangeStarted = false;

    const returnToApp = (accountSwitch?: "google") => {
      if (!active || redirected) return;
      redirected = true;
      const destination = new URL(getOAuthReturnUrl());
      if (accountSwitch) destination.searchParams.set("account_switch", accountSwitch);
      window.location.replace(destination.toString());
    };

    const completeCallback = async () => {
      const callbackUrl = new URL(window.location.href);
      const callbackHash = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
      const oauthError = callbackUrl.searchParams.get("error_description")
        || callbackUrl.searchParams.get("error")
        || callbackHash.get("error_description")
        || callbackHash.get("error");
      if (oauthError) {
        const errorCode = callbackUrl.searchParams.get("error_code") || callbackUrl.searchParams.get("error")
          || callbackHash.get("error_code") || callbackHash.get("error");
        if (errorCode === "identity_already_exists" || /already linked to another user/i.test(oauthError)) {
          returnToApp("google");
          return;
        }
        setError(oauthError);
        return;
      }

      const code = callbackUrl.searchParams.get("code");
      if (code) {
        callbackExchangeStarted = true;
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        if (!exchangeData.session) {
          setError("Googleログイン後のセッションを確認できませんでした。");
          return;
        }
        returnToApp();
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) returnToApp();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION can be the account that existed before Google OAuth.
      // Returning on that event races the PKCE code exchange and can restore
      // the wrong player. Only an actual callback sign-in may complete here.
      if (!callbackExchangeStarted && event === "SIGNED_IN" && session) returnToApp();
    });
    void completeCallback();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="app-container">
      <div className="app-loading-screen">
        {error ? (
          <div className="modal-card border-danger" style={{ maxWidth: 420 }}>
            <div className="modal-title text-color-danger">Googleログインに失敗しました</div>
            <div className="modal-desc">{error}</div>
            <a className="modal-close-btn background-danger" href={getOAuthReturnUrl()}>
              TRIBE NEONへ戻る
            </a>
          </div>
        ) : (
          <>
            <div className="spinner" />
            <div className="modal-desc mt-3">Googleログインを完了しています...</div>
          </>
        )}
      </div>
    </main>
  );
}
