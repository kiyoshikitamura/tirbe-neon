import React from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import "./LegalPanel.css";

export default function LegalPanel() {
  const { showLegalPage, setShowLegalPage } = useGame();

  if (!showLegalPage) return null;

  const handleClose = () => {
    setShowLegalPage(null);
  };

  const getTitle = () => {
    switch (showLegalPage) {
      case "tos": return "利用規約";
      case "privacy": return "プライバシーポリシー";
      case "commercial": return "特定商取引法に基づく表記";
      default: return "法的情報";
    }
  };

  const renderContent = () => {
    switch (showLegalPage) {
      case "tos":
        return (
          <>
            <h4 className="legal-section-title">利用規約</h4>
            <p className="legal-text">
              本利用規約は、本サービスの利用に関する条件を定めるものです。<br /><br />
              第1条 (適用)<br />
              本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。<br /><br />
              (開発中: 詳細な規約内容は後日追加されます)
            </p>
          </>
        );
      case "privacy":
        return (
          <>
            <h4 className="legal-section-title">プライバシーポリシー</h4>
            <p className="legal-text">
              当社は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。<br /><br />
              1. 個人情報の収集方法<br />
              当社は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレスなどの個人情報をお尋ねすることがあります。<br /><br />
              (開発中: 詳細なポリシー内容は後日追加されます)
            </p>
          </>
        );
      case "commercial":
        return (
          <>
            <h4 className="legal-section-title">特定商取引法に基づく表記</h4>
            <p className="legal-text">
              販売事業者: 株式会社〇〇<br />
              運営責任者: 〇〇 〇〇<br />
              所在地: 東京都〇〇区〇〇<br />
              お問い合わせ: info@example.com<br />
              販売価格: 各商品ページに記載<br />
              (開発中: 詳細な表記内容は後日追加されます)
            </p>
          </>
        );
      default:
        return (
          <>
            <h4 className="legal-section-title">法的情報</h4>
            <p className="legal-text">該当する情報がありません。</p>
          </>
        );
    }
  };

  return (
    <FullScreenPanel title={getTitle()} onClose={handleClose}>
      <div className="legal-panel-container-inner">
        {renderContent()}
      </div>
    </FullScreenPanel>
  );
}
