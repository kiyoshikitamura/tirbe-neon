"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export function useAuth(
  playCyberSe: (type: string) => void,
  stopCyberBgm: () => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  navigateTab: (tabName: string) => void,
  checkIfSetupRequired: (userId: string) => Promise<void>,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);
  const [setupUsername, setSetupUsername] = useState<string>("");
  const [setupCharacterId, setSetupCharacterId] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [setupAreaId, setSetupAreaId] = useState<string>("shinjuku");
  const [setupGiftCode, setSetupGiftCode] = useState<string>("");
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);

  // アバターメイキング用セットアップステート
  const [setupGender, setSetupGender] = useState<string>("MALE");
  const [setupHairId, setSetupHairId] = useState<string>("hair_male_spiky");
  const [setupFaceId, setSetupFaceId] = useState<string>("face_male_smirk");

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("パスワードは最小6文字以上である必要があります。");
      return;
    }
    setSetupLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setConfirmDialogConfig({ isOpen: true, title: "サインアップ完了", message: "サインアップに成功しました。確認メールをチェックしてログインしてください。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }
    setSetupLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSetupLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (e: any) {
      setErrorMessage(e.message);
      setSetupLoading(false);
    }
  };

  const handleGoogleDemoLogin = async () => {
    setSetupLoading(true);
    playCyberSe("click");
    
    try {
      let demoId = localStorage.getItem("tribe_demo_uuid");
      let isNew = false;
      
      if (!demoId) {
        demoId = "00000000-0000-4000-8000-" + Math.floor(100000000000 + Math.random() * 900000000000).toString();
        localStorage.setItem("tribe_demo_uuid", demoId);
        isNew = true;
      }

      const mockSession = {
        user: {
          id: demoId,
          email: `demo-${demoId.substring(0, 8)}@example.com`
        }
      };

      setSession(mockSession);

      // In the browser QA environment a new demo identity is provisioned by
      // get_user_setup_status. Do not route the reviewer through onboarding.
      if (isNew) {
        await checkIfSetupRequired(demoId);
        return;
      }

      if (isNew) {
        setIsSetupRequired(true);
        setConfirmDialogConfig({ isOpen: true, title: "デモ認証", message: "【Googleデモ認証】 新しいデモセッションを作成しました。「ユーザー登録」画面へ進みます。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } else {
        await checkIfSetupRequired(demoId);
        setConfirmDialogConfig({ isOpen: true, title: "デモ認証", message: "【Googleデモ認証】 既存のデモアカウントでログインしました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      }
    } catch (err: any) {
      console.warn("Google demo auth failed:", err.message);
      setErrorMessage("Googleデモ認証の処理中にエラーが発生しました。");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleInitializeUser = async () => {
    if (!setupUsername.trim()) {
      setErrorMessage("ユーザー名を入力してください。");
      return;
    }
    if (Array.from(setupUsername.trim()).length > 8) {
      setErrorMessage("ユーザー名は8文字以内で入力してください。");
      return;
    }
    setSetupLoading(true);
    try {
      const { error } = await supabase.rpc("initialize_new_user", {
        p_user_id: session.user.id,
        p_username: setupUsername.trim(),
        p_character_id: "11111111-1111-1111-1111-111111111111",
        p_area_id: setupAreaId,
        p_gift_code: setupGiftCode.trim() || null,
        p_gender: setupGender,
        p_hair_id: setupHairId,
        p_face_id: setupFaceId
      });

      if (error) {
        if (
          error.message?.includes("すでに初期セットアップが完了") || 
          error.message?.includes("already exists") ||
          error.message?.includes("duplicate key")
        ) {
          setIsSetupRequired(false);
          setSetupGiftCode("");
          await syncBootstrapData(session.user.id);
          navigateTab("home");
          return;
        }
        setErrorMessage(error.message);
        return;
      }

      setSetupGiftCode("");
      const { error: tutorialError } = await supabase.rpc("start_tutorial_progress");
      if (tutorialError) throw tutorialError;
      setIsSetupRequired(false);
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "登録完了", message: "プレイヤー登録が完了し、東京支配の戦いに参入しました！まずはチュートリアルスカウトで最初の構成員をスカウトしてください。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      navigateTab("gacha");
    } catch (err: any) {
      console.warn(err);
      setErrorMessage("初期化に失敗しました。");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLogout = async () => {
    setConfirmDialogConfig({
      isOpen: true,
      title: "ログアウト確認",
      message: "本当にログアウトしますか？",
      onConfirm: async () => {
        setConfirmDialogConfig(null);
        stopCyberBgm();
        
        localStorage.removeItem("tribe_demo_uuid");
        setSession(null);
        setIsSetupRequired(false);
        
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn("Signout error:", e);
        }
      },
      onCancel: () => setConfirmDialogConfig(null)
    });
  };

  return {
    session, setSession,
    authLoading, setAuthLoading,
    isSetupRequired, setIsSetupRequired,
    setupUsername, setSetupUsername,
    setupCharacterId, setSetupCharacterId,
    setupAreaId, setSetupAreaId,
    setupGiftCode, setSetupGiftCode,
    giftCode, setGiftCode,
    setupLoading, setSetupLoading,
    setupGender, setSetupGender,
    setupHairId, setSetupHairId,
    setupFaceId, setSetupFaceId,
    email, setEmail,
    password, setPassword,
    errorMessage, setErrorMessage,
    handleEmailSignup,
    handleEmailLogin,
    handleGoogleLogin,
    handleGoogleDemoLogin,
    handleInitializeUser,
    handleLogout
  };
}
