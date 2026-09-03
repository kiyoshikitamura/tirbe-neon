import type { Metadata } from "next";
import LegalPage from "../LegalPage";

export const metadata: Metadata = { title: "利用規約 | TRIBE NEON" };

type TermsPageProps = { searchParams: Promise<{ from?: string }> };

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const { from } = await searchParams;
  return (
    <LegalPage title="利用規約" updatedAt="2026年8月5日" returnToGame={from === "settings"}>
      <p className="legal-page-notice">本ページは開発・検証環境用の草案です。正式公開前に、運営者情報および正式な規約文を確定し、法務確認を完了してください。</p>
      <h2>第1条（適用）</h2>
      <p>本規約は、TRIBE NEON（以下「本サービス」）の利用条件を定めるものです。ユーザーは、本規約に同意した上で本サービスを利用します。</p>
      <h2>第2条（アカウント）</h2>
      <p>ユーザーは、自己の責任でアカウント情報を管理するものとします。第三者による不正利用が判明した場合は、運営者が定める窓口へ速やかに連絡してください。</p>
      <h2>第3条（禁止事項）</h2>
      <p>不正アクセス、ゲームデータの改ざん、自動化ツール等による不正利用、他者への迷惑行為、法令または公序良俗に反する行為を禁止します。</p>
      <h2>第4条（サービスの変更・停止）</h2>
      <p>運営者は、保守、障害対応、法令対応その他の必要がある場合、本サービスの内容を変更または提供を停止することがあります。</p>
    </LegalPage>
  );
}
