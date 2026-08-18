"use client";

import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import AvatarRenderer from "./AvatarRenderer";
import "./AvatarTab.css";

type PartCategory = "HAIR" | "FACE" | "BODY" | "SHOES" | "ACCESSORY" | "BACKGROUND_EFFECT";

export default function AvatarTab() {
  const {
    userAvatar,
    unlockedAvatarParts,
    avatarPartsMaster,
    avatarLoading,
    handleBuyAvatarPart,
    handleSaveAvatar,
    cash,
    diamonds,
    navigateTab,
    playCyberSe
  } = useGame();

  const [activeCategory, setActiveCategory] = useState<PartCategory>("HAIR");
  
  // 装着プレビュー用の一時状態 (初期状態は現在の userAvatar)
  const [previewGender, setPreviewGender] = useState<string>("MALE");
  const [previewHair, setPreviewHair] = useState<string>("");
  const [previewFace, setPreviewFace] = useState<string>("");
  const [previewBody, setPreviewBody] = useState<string>("body_basic");
  const [previewShoes, setPreviewShoes] = useState<string | null>(null);
  const [previewAccessory, setPreviewAccessory] = useState<string | null>(null);
  const [previewBg1, setPreviewBg1] = useState<string | null>(null);
  const [previewBg2, setPreviewBg2] = useState<string | null>(null);

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 初回ロード時、または userAvatar が同期された時にプレビュー状態を初期化
  useEffect(() => {
    if (userAvatar) {
      setPreviewGender(userAvatar.gender);
      setPreviewHair(userAvatar.hair_id || "");
      setPreviewFace(userAvatar.face_id || "");
      setPreviewBody(userAvatar.body_id || "body_basic");
      setPreviewShoes(userAvatar.shoes_id || null);
      setPreviewAccessory(userAvatar.accessory_id || null);
      setPreviewBg1(userAvatar.bg_effect_1_id || null);
      setPreviewBg2(userAvatar.bg_effect_2_id || null);
    }
  }, [userAvatar]);

  const categories: { key: PartCategory; label: string }[] = [
    { key: "HAIR", label: "髪型" },
    { key: "FACE", label: "表情" },
    { key: "BODY", label: "服" },
    { key: "SHOES", label: "靴" },
    { key: "ACCESSORY", label: "アクセ" },
    { key: "BACKGROUND_EFFECT", label: "エフェクト" }
  ];

  // 選択中のカテゴリに応じたパーツリストを取得 (性別限定パーツのフィルタ処理も行う)
  const getFilteredParts = () => {
    return avatarPartsMaster.filter((part: any) => {
      // カテゴリ一致チェック
      if (part.part_type !== activeCategory) return false;

      // 素体はメイキング専用かつ素体選択なので着せ替えリストには含めない
      if (part.id === "base_male" || part.id === "base_female") return false;

      // 髪型・表情の性別チェック
      if (activeCategory === "HAIR" || activeCategory === "FACE") {
        const isMalePart = part.id.includes("male");
        const isFemalePart = part.id.includes("female");
        if (previewGender === "MALE" && isFemalePart) return false;
        if (previewGender === "FEMALE" && isMalePart) return false;
      }

      return true;
    });
  };

  const filteredParts = getFilteredParts();

  // パーツ装着処理 (プレビュー状態の更新)
  const handleEquipPart = (partId: string, partType: string) => {
    playCyberSe("click");
    setErrorMsg(null);
    setSaveSuccess(false);

    switch (partType) {
      case "HAIR":
        setPreviewHair(partId);
        break;
      case "FACE":
        setPreviewFace(partId);
        break;
      case "BODY":
        setPreviewBody(partId);
        break;
      case "SHOES":
        setPreviewShoes(prev => (prev === partId ? null : partId));
        break;
      case "ACCESSORY":
        setPreviewAccessory(prev => (prev === partId ? null : partId));
        break;
      case "BACKGROUND_EFFECT":
        // 背景エフェクトは枠が2つあるため、タップされたものをスロット1 ➔ スロット2 の順に割り当てる
        if (previewBg1 === partId) {
          setPreviewBg1(null);
        } else if (previewBg2 === partId) {
          setPreviewBg2(null);
        } else if (!previewBg1) {
          setPreviewBg1(partId);
        } else if (!previewBg2) {
          setPreviewBg2(partId);
        } else {
          // 両方埋まっている場合はスロット1を上書き
          setPreviewBg1(partId);
        }
        break;
    }
  };

  // パーツ購入処理
  const handleBuyPart = async (part: any) => {
    playCyberSe("click");
    setErrorMsg(null);
    setSaveSuccess(false);

    const currency = part.price_diamond > 0 ? "DIAMOND" : "CASH";
    const price = part.price_diamond > 0 ? part.price_diamond : part.price_cash;

    const res = await handleBuyAvatarPart(part.id, currency, price);
    if (res.success) {
      // 購入に成功したら自動的に装着
      handleEquipPart(part.id, part.part_type);
    } else {
      setErrorMsg(res.message || "購入に失敗しました。");
    }
  };

  // 装着状態の保存
  const handleSave = async () => {
    playCyberSe("click");
    setErrorMsg(null);
    setSaveSuccess(false);

    if (!previewHair || !previewFace || !previewBody) {
      setErrorMsg("髪型、表情、服装は必須設定です。");
      return;
    }

    const res = await handleSaveAvatar(
      previewGender,
      previewHair,
      previewFace,
      previewBody,
      previewShoes,
      previewAccessory,
      previewBg1,
      previewBg2
    );

    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setErrorMsg(res.message || "アバターの保存に失敗しました。");
    }
  };

  // 性別切り替え（プレビュー状態の関連パーツをリセット）
  const handleGenderToggle = (gender: string) => {
    playCyberSe("click");
    setPreviewGender(gender);
    if (gender === "MALE") {
      setPreviewHair("hair_male_spiky");
      setPreviewFace("face_male_smirk");
    } else {
      setPreviewHair("hair_female_spiky");
      setPreviewFace("face_female_standard");
    }
    setErrorMsg(null);
    setSaveSuccess(false);
  };

  const previewAvatarConfig = {
    gender: previewGender,
    hair_id: previewHair,
    face_id: previewFace,
    body_id: previewBody,
    shoes_id: previewShoes,
    accessory_id: previewAccessory,
    bg_effect_1_id: previewBg1,
    bg_effect_2_id: previewBg2
  };

  return (
    <div className="avatar-tab-container scroll-container">
      {/* ヘッダー */}
      <div className="view-header-row">
        <h2 className="view-title">アバター着せ替え</h2>
        <button 
          className="sub-btn active-scale-effect" 
          onClick={() => { navigateTab("menu"); playCyberSe("click"); }}
        >
          戻る
        </button>
      </div>

      <div className="avatar-tab-content">
        {/* 左側: プレビュー＆操作エリア */}
        <div className="avatar-preview-section">
          {/* レイヤーレンダラー (showBackground=true で路地裏背景) */}
          <div className="avatar-render-box">
            <AvatarRenderer avatar={previewAvatarConfig} size={240} showBackground={true} />
          </div>

          {/* 性別切り替えトグル */}
          <div className="gender-toggle-container">
            <span className="font-size-8 text-secondary block mb-1">性別</span>
            <div className="flex-row-gap-2">
              <button
                type="button"
                onClick={() => handleGenderToggle("MALE")}
                className={`gender-btn active-scale-effect ${previewGender === "MALE" ? "active" : ""}`}
              >
                男
              </button>
              <button
                type="button"
                onClick={() => handleGenderToggle("FEMALE")}
                className={`gender-btn active-scale-effect ${previewGender === "FEMALE" ? "active" : ""}`}
              >
                女
              </button>
            </div>
          </div>

          {/* 保存ステータスメッセージ */}
          <div className="avatar-status-msg">
            {saveSuccess && <span className="status-success font-size-8 font-weight-bold">アバター設定を保存しました！</span>}
            {errorMsg && <span className="status-danger font-size-8 font-weight-bold">{errorMsg}</span>}
          </div>

          {/* 保存＆初期化ボタン */}
          <div className="avatar-action-buttons">
            <button
              onClick={handleSave}
              disabled={avatarLoading}
              className="claim-reward-btn avatar-save-btn active-scale-effect flex-row-center-spinner"
            >
              {avatarLoading ? <div className="spinner" /> : "アバターを保存 (DB同期)"}
            </button>
          </div>
        </div>

        {/* 右側: カテゴリ＆ショップリスト */}
        <div className="avatar-parts-section">
          {/* 所持資金HUD */}
          <div className="avatar-funds-hud">
            <div className="funds-box">
              <span className="funds-label">Cash</span>
              <span className="funds-val">{cash.toLocaleString()}</span>
            </div>
            <div className="funds-box">
              <span className="funds-label">Dia</span>
              <span className="funds-val">{diamonds.toLocaleString()}</span>
            </div>
          </div>

          {/* カテゴリタブ */}
          <div className="avatar-category-tabs scroll-container-x">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); playCyberSe("click"); }}
                className={`category-tab-btn active-scale-effect ${activeCategory === cat.key ? "active" : ""}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* パーツリスト */}
          <div className="avatar-parts-grid scroll-container">
            {filteredParts.length === 0 ? (
              <div className="empty-parts-message font-size-9 text-secondary text-center py-4">
                対象のパーツがありません
              </div>
            ) : (
              filteredParts.map((part: any) => {
                const isUnlocked = unlockedAvatarParts.includes(part.id);
                
                // 装着チェック
                let isEquipped = false;
                if (part.part_type === "HAIR") isEquipped = previewHair === part.id;
                else if (part.part_type === "FACE") isEquipped = previewFace === part.id;
                else if (part.part_type === "BODY") isEquipped = previewBody === part.id;
                else if (part.part_type === "SHOES") isEquipped = previewShoes === part.id;
                else if (part.part_type === "ACCESSORY") isEquipped = previewAccessory === part.id;
                else if (part.part_type === "BACKGROUND_EFFECT") {
                  isEquipped = previewBg1 === part.id || previewBg2 === part.id;
                }

                // スロット判定 (背景エフェクトのみ)
                const effectSlotLabel = part.part_type === "BACKGROUND_EFFECT" && isEquipped
                  ? (previewBg1 === part.id ? " (枠1)" : " (枠2)")
                  : "";

                return (
                  <div 
                    key={part.id} 
                    className={`parts-item-card steel-row ${isEquipped ? "equipped-border" : ""}`}
                  >
                    {/* パーツサムネイル */}
                    <div className="parts-thumb-box">
                      <img 
                        src={part.image_path} 
                        alt={part.name}
                        className="parts-thumb-img"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/avatar/body_basic.webp"; }}
                      />
                    </div>

                    {/* パーツ情報 */}
                    <div className="parts-info-box">
                      <div className="parts-name font-size-9 font-weight-bold">
                        {part.name}
                        {effectSlotLabel && <span className="text-color-cyan font-size-7">{effectSlotLabel}</span>}
                      </div>
                      <div className="parts-status font-size-7 text-secondary">
                        {isUnlocked ? "所有済み" : "未所有"}
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="parts-action-box">
                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipPart(part.id, part.part_type)}
                          className={`claim-reward-btn parts-equip-btn active-scale-effect ${isEquipped ? "equipped" : ""}`}
                        >
                          {isEquipped ? "解除" : "装着"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyPart(part)}
                          disabled={avatarLoading}
                          className="claim-reward-btn parts-buy-btn active-scale-effect"
                        >
                          {part.price_diamond > 0 ? (
                            <span>{part.price_diamond} Dia</span>
                          ) : (
                            <span>{part.price_cash.toLocaleString()} Cash</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
