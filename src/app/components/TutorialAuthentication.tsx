"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase";
import { getExternalBrowserUrl, getOAuthCallbackUrl, isXInAppBrowser } from "@/utils/browserDetection";
import { useGame } from "../context/GameContext";
import ExternalBrowserGooglePrompt from "./ExternalBrowserGooglePrompt";

const AUTH_INTENT_KEY = "tribe_onboarding_auth_intent";
const EMAIL_INTENT_KEY = "tribe_onboarding_email_intent";
const AUTH_INTENT_MAX_AGE_MS = 30 * 60 * 1000;
const EMAIL_INTENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type AuthenticationIntent = {
  method: "GOOGLE";
  userId: string;
  startedAt: number;
};

type EmailIntent = {
  method: "EMAIL";
  userId: string;
  email: string;
  startedAt: number;
};

function readGoogleIntent(): AuthenticationIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(AUTH_INTENT_KEY) || "null") as AuthenticationIntent | null;
    const age = Date.now() - (value?.startedAt || 0);
    return value?.method === "GOOGLE"
      && typeof value.userId === "string"
      && age >= 0
      && age <= AUTH_INTENT_MAX_AGE_MS
      ? value
      : null;
  } catch {
    return null;
  }
}

function readEmailIntent(): EmailIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(EMAIL_INTENT_KEY) || "null") as EmailIntent | null;
    const age = Date.now() - (value?.startedAt || 0);
    return value?.method === "EMAIL"
      && typeof value.userId === "string"
      && typeof value.email === "string"
      && age >= 0
      && age <= EMAIL_INTENT_MAX_AGE_MS
      ? value
      : null;
  } catch {
    return null;
  }
}

function getOAuthReturnError(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("error_code") || query.get("error") || hash.get("error_code") || hash.get("error");
  if (!code) return null;
  if (code === "access_denied") return "Google連携はキャンセルされました。もう一度お試しください。";
  if (code === "identity_already_exists") return "このGoogleアカウントは既存アカウントで使用されています。既存アカウントへログインするか、別のGoogleアカウントを使用してください。";
  const description = query.get("error_description") || hash.get("error_description");
  return description || "Google連携を完了できませんでした。もう一度お試しください。";
}

function getGoogleLinkError(code?: string, fallback?: string) {
  if (code === "identity_already_exists" || code === "user_already_exists") {
    return "このGoogleアカウントは既存アカウントで使用されています。既存アカウントへログインするか、別のGoogleアカウントを使用してください。";
  }
  if (code === "manual_linking_disabled") {
    return "Google連携を現在利用できません。認証設定を確認してください。";
  }
  return fallback || "Google連携を完了できませんでした。もう一度お試しください。";
}

export default function TutorialAuthentication() {
  const { session, onboardingState, setOnboardingState, playCyberSe } = useGame();
  const step = onboardingState?.tutorial_step ?? null;
  const [email, setEmail] = useState(() => readEmailIntent()?.email || "");
  const [googleExternalBrowserUrl, setGoogleExternalBrowserUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => getOAuthReturnError());
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const workingRef = useRef(false);

  const beginWorking = () => {
    if (workingRef.current) return false;
    workingRef.current = true;
    setWorking(true);
    return true;
  };

  const endWorking = () => {
    workingRef.current = false;
    setWorking(false);
  };

  const finalize = useCallback(async (method: "EMAIL" | "GOOGLE") => {
    if (method === "GOOGLE") {
      const intent = readGoogleIntent();
      if (intent && intent.userId !== session?.user?.id) {
        window.localStorage.removeItem(AUTH_INTENT_KEY);
        setError("Google連携の開始時と異なるユーザーが検出されました。データ保護のため連携を中止しました。");
        return false;
      }
    }
    const { error: progressError } = await supabase.rpc("complete_tutorial_authentication", {
      p_auth_method: method
    });
    if (progressError) {
      setError(progressError.message);
      return false;
    }
    if (method === "GOOGLE") window.localStorage.removeItem(AUTH_INTENT_KEY);
    if (method === "EMAIL") window.localStorage.removeItem(EMAIL_INTENT_KEY);
    setNotice(null);
    setOnboardingState((current: any) => current ? {
      ...current,
      tutorial_step: "AUTHENTICATION",
      auth_method: method,
      supported_identity_count: 1,
      identity_integrity_valid: true,
    } : current);
    return true;
  }, [session?.user?.id, setOnboardingState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(AUTH_INTENT_KEY) && !readGoogleIntent()) {
      window.localStorage.removeItem(AUTH_INTENT_KEY);
    }
    if (window.localStorage.getItem(EMAIL_INTENT_KEY) && !readEmailIntent()) {
      window.localStorage.removeItem(EMAIL_INTENT_KEY);
    }
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (!query.has("error") && !query.has("error_code") && !hash.has("error") && !hash.has("error_code")) return;
    window.localStorage.removeItem(AUTH_INTENT_KEY);
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash.startsWith("#/") ? window.location.hash : ""}`);
  }, []);

  useEffect(() => {
    const identities = session?.user?.identities || [];
    const providers = new Set(identities.map((identity: { provider?: string }) => identity.provider));
    if (step !== "COMPLETE") return;
    if (session?.user?.is_anonymous && session?.user?.new_email) return;
    const hasOnlyGoogle = providers.has("google") && !providers.has("email");
    if (!session?.user?.is_anonymous && hasOnlyGoogle) {
      const completionTimer = window.setTimeout(() => void finalize("GOOGLE"), 0);
      return () => window.clearTimeout(completionTimer);
    }
  }, [finalize, session?.user?.identities, session?.user?.is_anonymous, session?.user?.new_email, step]);

  const googleIntent = readGoogleIntent();
  const googleIdentityMismatch = Boolean(googleIntent && session?.user?.id && googleIntent.userId !== session.user.id);
  const providers = new Set((session?.user?.identities || []).map((identity: { provider?: string }) => identity.provider));
  const hasOnlyEmailIdentity = !session?.user?.is_anonymous && providers.has("email") && !providers.has("google");

  if (step !== "COMPLETE" && !googleIdentityMismatch) return null;

  const connectEmail = async () => {
    if ((!hasOnlyEmailIdentity && !email.trim()) || password.length < 6) {
      setError("メールアドレスと6文字以上のパスワードを入力してください。");
      return;
    }
    if (!beginWorking()) return;
    setError(null);
    setNotice(null);
    window.localStorage.removeItem(AUTH_INTENT_KEY);
    playCyberSe("click");
    if (hasOnlyEmailIdentity) {
      const emailIntent = readEmailIntent();
      if (emailIntent && emailIntent.userId !== session?.user?.id) {
        window.localStorage.removeItem(EMAIL_INTENT_KEY);
        setError("メール連携の開始時と異なるユーザーが検出されました。データ保護のため連携を中止しました。");
        endWorking();
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) setError(passwordError.message);
      else await finalize("EMAIL");
      endWorking();
      return;
    }

    const normalizedEmail = email.trim();
    const emailIntent: EmailIntent = { method: "EMAIL", userId: session!.user.id, email: normalizedEmail, startedAt: Date.now() };
    window.localStorage.setItem(EMAIL_INTENT_KEY, JSON.stringify(emailIntent));
    const { data: updateData, error: updateError } = await supabase.auth.updateUser(
      { email: normalizedEmail },
      { emailRedirectTo: window.location.origin }
    );
    if (updateError) {
      window.localStorage.removeItem(EMAIL_INTENT_KEY);
      const collisionCodes = ["email_exists", "user_already_exists", "identity_already_exists"];
      setError(collisionCodes.includes(updateError.code || "")
        ? "このメールアドレスは既存アカウントで使用されています。既存アカウントへログインするか、別のメールアドレスを使用してください。"
        : updateError.message);
    } else {
      const { data: refreshData } = await supabase.auth.refreshSession();
      const linkedUser = refreshData.session?.user || updateData.user;
      const hasEmailIdentity = linkedUser?.identities?.some((identity: { provider?: string }) => identity.provider === "email");
      if (hasEmailIdentity && !linkedUser?.is_anonymous) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) setError(passwordError.message);
        else await finalize("EMAIL");
      } else {
        setNotice(`確認メールを ${normalizedEmail} に送信しました。メール内のリンクを開いた後、パスワードを再入力して連携を完了してください。`);
      }
    }
    endWorking();
  };

  const connectGoogle = async () => {
    if (isXInAppBrowser()) {
      setGoogleExternalBrowserUrl(getExternalBrowserUrl());
      setError(null);
      return;
    }
    if (!session?.user?.id || !session.user.is_anonymous) {
      setError("匿名ユーザーのセッションを確認できません。ページを再読み込みしてからお試しください。");
      return;
    }
    if (!beginWorking()) return;
    setError(null);
    setNotice(null);
    playCyberSe("click");
    const intent: AuthenticationIntent = { method: "GOOGLE", userId: session.user.id, startedAt: Date.now() };
    window.localStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
    const { data: linkData, error: linkError } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: getOAuthCallbackUrl() }
    });
    if (linkError) {
      window.localStorage.removeItem(AUTH_INTENT_KEY);
      setError(getGoogleLinkError(linkError.code, linkError.message));
      endWorking();
      return;
    }
    if (!linkData?.url) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      const linkedUser = refreshData.session?.user;
      const hasGoogleIdentity = linkedUser?.identities?.some((identity: { provider?: string }) => identity.provider === "google");
      if (refreshError || !linkedUser || linkedUser.id !== intent.userId || linkedUser.is_anonymous || !hasGoogleIdentity) {
        window.localStorage.removeItem(AUTH_INTENT_KEY);
        setError("Google連携後のユーザー情報を確認できませんでした。ページを再読み込みしてからお試しください。");
      } else {
        await finalize("GOOGLE");
      }
      endWorking();
    }
  };

  const pendingEmailNotice = session?.user?.is_anonymous && session?.user?.new_email
    ? `確認メールを ${session.user.new_email} に送信しました。メール内のリンクを開いてください。`
    : null;
  const verifiedEmailNotice = hasOnlyEmailIdentity
    ? "メール確認が完了しました。パスワードを入力してアカウント連携を完了してください。"
    : null;
  const displayedNotice = notice || pendingEmailNotice || verifiedEmailNotice;
  const identityConflict = providers.has("email") && providers.has("google")
    ? "メールとGoogleの両方が検出されました。データ保護のため認証完了を中止しました。"
    : null;

  return (
    googleExternalBrowserUrl ? (
      <ExternalBrowserGooglePrompt
        url={googleExternalBrowserUrl}
        onClose={() => setGoogleExternalBrowserUrl(null)}
      />
    ) : (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-title text-left">ゲームデータを保存</div>
        <div className="modal-desc text-left mb-3">
          データを引き継げるよう、Googleまたはメールのどちらか1つを連携してください。同じアカウントで両方を使用することはできません。
        </div>
        <input className="auth-input mb-2" type="email" placeholder="メールアドレス" value={email} onChange={(event) => setEmail(event.target.value)} disabled={hasOnlyEmailIdentity} />
        <input className="auth-input" type="password" placeholder="パスワード（6文字以上）" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="semantic-cta semantic-cta--primary mt-3 width-100" onClick={() => void connectEmail()} disabled={working || googleIdentityMismatch} aria-busy={working}>
          {working ? "連携中..." : hasOnlyEmailIdentity ? "パスワードを設定して完了" : "メールアカウントを連携"}
        </button>
        <button className="semantic-cta semantic-cta--secondary mt-2 width-100" onClick={() => void connectGoogle()} disabled={working || googleIdentityMismatch || hasOnlyEmailIdentity} aria-busy={working}>
          {working ? "連携中..." : "Googleアカウントを連携"}
        </button>
        {displayedNotice && <div className="text-color-cyan font-size-7 mt-2" role="status">{displayedNotice}</div>}
        {(error || identityConflict || googleIdentityMismatch) && <div className="text-color-red font-size-7 mt-2">
          {error || identityConflict || "Google連携の開始時と異なるユーザーが検出されました。データ保護のため連携を中止しました。"}
        </div>}
      </div>
    </div>
    )
  );
}
