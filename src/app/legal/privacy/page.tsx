import type { Metadata } from "next";
import LegalPage from "../LegalPage";

export const metadata: Metadata = { title: "プライバシーポリシー | TRIBE NEON" };

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updatedAt="2026年8月5日">
      <p className="legal-page-notice">本ページは開発・検証環境用の草案です。正式公開前に、実際の取得情報、外部サービス、問い合わせ先および保管期間を反映した正式文面へ更新してください。</p>
      <h2>1. 取得する情報</h2>
      <p>本サービスは、アカウント識別情報、ゲーム内プロフィール情報、利用状況、端末・ブラウザ情報その他サービス提供に必要な情報を取得することがあります。</p>
      <h2>2. 利用目的</h2>
      <p>取得した情報は、アカウント認証、ゲーム機能の提供、不正利用の防止、問い合わせ対応、サービス品質の改善のために利用します。</p>
      <h2>3. 第三者提供</h2>
      <p>法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。ただし、決済・認証・インフラ提供に必要な委託先の取扱いは、正式ポリシーで明記します。</p>
      <h2>4. お問い合わせ</h2>
      <p>個人情報に関する問い合わせ窓口は、正式公開時に本ページへ掲載します。</p>
    </LegalPage>
  );
}
