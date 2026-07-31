import React, { useState } from "react";
import "./UiPreviewTab.css";
import { useGame } from "../context/GameContext";
import OutlawButton from "./ui/OutlawButton";
import OutlawCard from "./ui/OutlawCard";
import SectionHeader from "./ui/SectionHeader";
import SubTabNav from "./ui/SubTabNav";
import FullScreenPanel from "./ui/FullScreenPanel";

export default function UiPreviewTab() {
  const { navigateTab, setConfirmDialogConfig, setGlobalInteractionBlocking } = useGame();
  const [activeSubTab, setActiveSubTab] = useState("tab1");
  const [showPanel, setShowPanel] = useState(false);

  const handleShowConfirm = () => {
    setConfirmDialogConfig({
      isOpen: true,
      title: "確認",
      message: "この操作を実行してもよろしいですか？\n（これはテストです）",
      confirmText: "実行する",
      onConfirm: () => {
        setConfirmDialogConfig((prev: any) => ({ ...prev, isOpen: false }));
        // 連打ブロッカーのテスト
        setGlobalInteractionBlocking(true);
        setTimeout(() => setGlobalInteractionBlocking(false), 2000);
      },
      onCancel: () => {
        setConfirmDialogConfig((prev: any) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleShowDangerConfirm = () => {
    setConfirmDialogConfig({
      isOpen: true,
      title: "警告",
      message: "本当に削除しますか？\nこの操作は取り消せません。",
      confirmText: "削除する",
      isDanger: true,
      onConfirm: () => {
        setConfirmDialogConfig((prev: any) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setConfirmDialogConfig((prev: any) => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="ui-preview-tab custom-scrollbar">
      <SectionHeader title="UI PREVIEW" subTitle="共通コンポーネント確認" />

      <SubTabNav
        tabs={[
          { id: "tab1", label: "基本パーツ" },
          { id: "tab2", label: "拡張パーツ" },
        ]}
        activeTabId={activeSubTab}
        onSelect={setActiveSubTab}
        className="mb-4"
      />

      <div className="preview-content p-4">
        {activeSubTab === "tab1" && (
          <div className="flex flex-col gap-6">
            <OutlawCard glowLine="left">
              <h3 className="text-lg font-bold mb-3 text-neon-cyan">OutlawButton</h3>
              <div className="flex flex-col gap-3">
                <OutlawButton variant="primary">Primary Button</OutlawButton>
                <OutlawButton variant="secondary">Secondary Button</OutlawButton>
                <OutlawButton variant="danger">Danger Button</OutlawButton>
                <OutlawButton variant="neon">Neon Action</OutlawButton>
                <OutlawButton disabled>Disabled</OutlawButton>
                <OutlawButton variant="primary" fullWidth>Full Width</OutlawButton>
              </div>
            </OutlawCard>

            <OutlawCard glowLine="bottom">
              <h3 className="text-lg font-bold mb-3">OutlawCard (Interactive)</h3>
              <OutlawCard isInteractive onClick={() => console.log("Card Clicked")}>
                <div className="flex justify-between items-center">
                  <span>タップ可能なカード枠</span>
                  <span className="text-neon-cyan">＞</span>
                </div>
              </OutlawCard>
            </OutlawCard>
          </div>
        )}

        {activeSubTab === "tab2" && (
          <div className="flex flex-col gap-6">
            <OutlawCard glowLine="right">
              <h3 className="text-lg font-bold mb-3">ConfirmDialog</h3>
              <div className="flex flex-col gap-3">
                <OutlawButton variant="secondary" onClick={handleShowConfirm}>通常確認ダイアログを開く</OutlawButton>
                <OutlawButton variant="danger" onClick={handleShowDangerConfirm}>警告ダイアログを開く</OutlawButton>
              </div>
            </OutlawCard>

            <OutlawCard glowLine="top">
              <h3 className="text-lg font-bold mb-3">FullScreenPanel</h3>
              <OutlawButton variant="primary" onClick={() => setShowPanel(true)}>
                フルスクリーンパネルを開く
              </OutlawButton>
            </OutlawCard>
          </div>
        )}
      </div>

      {showPanel && (
        <FullScreenPanel title="テストパネル" onClose={() => setShowPanel(false)}>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-secondary">ここはフルスクリーンパネルの中身です。スクロールテスト用に高さを出します。</p>
            {Array.from({ length: 15 }).map((_, i) => (
              <OutlawCard key={i}>
                テストアイテム {i + 1}
              </OutlawCard>
            ))}
          </div>
        </FullScreenPanel>
      )}

      {/* ホームに戻るボタン（検証用の一時措置） */}
      <div className="mt-8 mb-4 px-4">
        <OutlawButton variant="secondary" fullWidth onClick={() => navigateTab("home")}>
          マイページに戻る
        </OutlawButton>
      </div>
    </div>
  );
}
