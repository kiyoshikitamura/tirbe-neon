"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/utils/supabase";

export default function KpiPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError || !data.session) setError("パスワード設定リンクが無効または期限切れです。");
      else setReady(true);
    });
    return () => { active = false; };
  }, []);

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("パスワードを設定できませんでした。8文字以上で入力してください。");
      setWorking(false);
      return;
    }
    window.location.replace("/admin/kpi");
  };

  return (
    <main className="kpi-password-shell">
      <section className="kpi-password-card">
        <span>TRIBE NEON / PRODUCTION</span>
        <h1>KPI Password</h1>
        {!ready && !error && <p>設定リンクを確認しています…</p>}
        {ready && (
          <form onSubmit={(event) => void updatePassword(event)}>
            <label htmlFor="new-password">新しいパスワード</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" disabled={working}>{working ? "設定中…" : "パスワードを設定"}</button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
      <style jsx>{`
        .kpi-password-shell{min-height:100dvh;display:grid;place-items:center;padding:24px;color:#eef7fa;background:#080d14}
        .kpi-password-card{width:min(420px,100%);padding:32px;border:1px solid #34404e;background:#0e151f}
        span{color:#27d7e6;font-size:11px;font-weight:800;letter-spacing:.16em} h1{margin:8px 0 24px;font-size:32px}
        form{display:grid;gap:10px} label{color:#9aa6b1;font-size:12px;font-weight:700} input{padding:12px;border:1px solid #34404e;color:#eef7fa;background:#080d14}
        button{margin-top:8px;padding:12px;border:1px solid #27d7e6;color:#dffcff;background:#10262d;font-weight:800} p{color:#ff8ca6;font-size:13px}
      `}</style>
    </main>
  );
}
