import type { Metadata } from "next";
import LegalPage from "../LegalPage";

export const metadata: Metadata = { title: "特定商取引法に基づく表記 | TRIBE NEON" };

export default function CommercialPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updatedAt="2026年8月5日">
      <p className="legal-page-notice">販売事業者名、所在地、連絡先、販売価格、支払方法および返金方針は未確定です。実課金を公開する前に、特定商取引法その他の適用法令に沿った正式な表記へ必ず差し替えてください。</p>
      <h2>販売事業者</h2>
      <p>正式公開前に確定・掲載します。</p>
      <h2>販売価格</h2>
      <p>各商品購入画面に表示します。表示価格以外に通信料等が発生する場合は、利用者が契約する通信事業者の定めによります。</p>
      <h2>代金の支払時期・方法</h2>
      <p>各決済サービスが定める時期および方法により支払われます。対応する決済手段は正式公開時に掲載します。</p>
      <h2>商品の提供時期</h2>
      <p>決済完了後、原則として速やかにゲーム内へ付与します。通信障害その他の事情により遅延する場合があります。</p>
      <h2>返品・返金</h2>
      <p>デジタルコンテンツの性質上、原則として返品・返金はできません。法令上必要な対応および障害時の取扱いは正式公開時に明記します。</p>
    </LegalPage>
  );
}
