import Link from "next/link";
import "./legal.css";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

export default function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <main className="legal-page">
      <section className="legal-page-card" aria-labelledby="legal-page-title">
        <Link href="/" className="legal-page-back">← タイトルへ戻る</Link>
        <p className="legal-page-brand">TRIBE: NEON REIGN</p>
        <h1 id="legal-page-title">{title}</h1>
        <p className="legal-page-updated">最終更新日: {updatedAt}</p>
        <div className="legal-page-content">{children}</div>
        <nav className="legal-page-nav" aria-label="法的情報">
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/legal/commercial">特定商取引法に基づく表記</Link>
        </nav>
        <p className="legal-page-copyright">© 2026 TRIBE: NEON REIGN. All rights reserved.</p>
      </section>
    </main>
  );
}
