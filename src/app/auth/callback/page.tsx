"use client";

import { useEffect, useState } from "react";
import { discardAnonymousAccountForSwitch, supabase } from "@/utils/supabase";
import { getOAuthReturnUrl } from "@/utils/browserDetection";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let redirected = false;
    let callbackExchangeStarted = false;

    const returnToApp = (accountSwitch?: "google", accountSwitchError?: string) => {
      if (!active || redirected) return;
      redirected = true;
      const destination = new URL(getOAuthReturnUrl());
      if (accountSwitch) destination.searchParams.set("account_switch", accountSwitch);
      if (accountSwitchError) destination.searchParams.set("account_switch_error", accountSwitchError);
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
        // linkIdentity can return a session for an already-linked Google
        // account. Preserve the anonymous tutorial session in memory so that
        // this collision can be presented as an explicit choice instead of
        // silently replacing the player at the title screen.
        const { data: beforeExchange } = await supabase.auth.getSession();
        let loginIntent: { method?: string; sourceUserId?: string } | null = null;
        try {
          loginIntent = JSON.parse(window.localStorage.getItem("tribe_existing_google_login_intent") || "null");
        } catch {
          loginIntent = null;
        }
        const switchingToExistingData = loginIntent?.method === "GOOGLE_SWITCH";
        const tutorialSession = beforeExchange.session?.user?.is_anonymous ? beforeExchange.session : null;
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        if (!exchangeData.session) {
          setError("Googleログイン後のセッションを確認できませんでした。");
          return;
        }
        if (switchingToExistingData) {
          if (!tutorialSession || tutorialSession.user.id !== loginIntent?.sourceUserId) {
            window.localStorage.removeItem("tribe_existing_google_login_intent");
            setError("切り替え元のチュートリアルデータを確認できませんでした。データ保護のため処理を中止しました。");
            return;
          }
          const { data: existingState, error: existingStateError } = await supabase.rpc("get_current_onboarding_state");
          if (existingStateError || !existingState?.has_profile) {
            await supabase.auth.setSession({
              access_token: tutorialSession.access_token,
              refresh_token: tutorialSession.refresh_token,
            });
            window.localStorage.removeItem("tribe_existing_google_login_intent");
            returnToApp(undefined, "NO_EXISTING_GAME_DATA");
            return;
          }
          const { data: discarded, error: discardError } = await discardAnonymousAccountForSwitch(tutorialSession);
          if (discardError || discarded?.discardedUserId !== tutorialSession.user.id || discarded?.gameplayMerged !== false) {
            await supabase.auth.setSession({
              access_token: tutorialSession.access_token,
              refresh_token: tutorialSession.refresh_token,
            });
            window.localStorage.removeItem("tribe_existing_google_login_intent");
            returnToApp(undefined, "ANONYMOUS_DISCARD_FAILED");
            return;
          }
          returnToApp();
          return;
        }
        if (tutorialSession && exchangeData.session.user.id !== tutorialSession.user.id) {
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: tutorialSession.access_token,
            refresh_token: tutorialSession.refresh_token,
          });
          if (restoreError) {
            setError("チュートリアルデータを保護できませんでした。画面を閉じてサポートへお問い合わせください。");
            return;
          }
          returnToApp("google");
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
