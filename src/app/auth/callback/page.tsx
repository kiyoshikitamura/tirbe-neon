"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { getOAuthReturnUrl } from "@/utils/browserDetection";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let redirected = false;

    const returnToApp = () => {
      if (!active || redirected) return;
      redirected = true;
      window.location.replace(getOAuthReturnUrl());
    };

    const completeCallback = async () => {
      const callbackUrl = new URL(window.location.href);
      const oauthError = callbackUrl.searchParams.get("error_description")
        || callbackUrl.searchParams.get("error");
      if (oauthError) {
        setError(oauthError);
        return;
      }

      const code = callbackUrl.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) returnToApp();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) returnToApp();
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
