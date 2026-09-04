"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";
import { OAUTH_RETURN_INTENT_KEY, rememberOAuthReturnTo } from "@/utils/browserDetection";

type Category = "acquisition" | "active_retention" | "guild" | "content" | "revenue";
type PeriodType = "daily" | "monthly" | "cohort";
type AccessState = "loading" | "admin" | "signed-out" | "denied";

type Snapshot = {
  run_id: string;
  metric_id: string;
  dimension_key: Record<string, string | number>;
  value: number | string | null;
  numerator: number | null;
  denominator: number | null;
  value_status: "provisional" | "final" | "not_applicable" | "unavailable";
  null_reason: string | null;
  calculated_at: string;
  source_watermark: string;
  finished_at: string;
};

const categories: Array<{ id: Category; label: string; eyebrow: string }> = [
  { id: "acquisition", label: "集客・新規", eyebrow: "ACQUISITION" },
  { id: "active_retention", label: "アクティブ・継続", eyebrow: "RETENTION" },
  { id: "guild", label: "ギルド", eyebrow: "COMMUNITY" },
  { id: "content", label: "コンテンツ", eyebrow: "CONTENT" },
  { id: "revenue", label: "売上・課金", eyebrow: "REVENUE" },
];

const metricLabels: Record<string, string> = {
  "user.new_anonymous": "新規ユーザー（匿名）",
  "user.new_authenticated": "新規ユーザー（認証）",
  "user.new_total": "新規ユーザー合計",
  "tutorial.completion_rate": "チュートリアル突破率",
  "active.dau": "DAU",
  "active.mau": "MAU",
  "guild.valid_count": "有効ギルド数",
  "guild.member_count": "ギルド人員数",
  "guild.active_count": "アクティブギルド数",
  "gacha.free10.character": "無料10連・キャラ",
  "gacha.free10.skill": "無料10連・スキル",
  "gacha.free10.equipment": "無料10連・装備",
  "revenue.pu": "PU",
  "revenue.gross": "売上",
  "revenue.arppu": "ARPPU",
  "revenue.arpu": "ARPU",
};

const statusLabels = {
  provisional: "暫定",
  final: "確定",
  not_applicable: "対象外",
  unavailable: "取得不可",
} as const;

const mockAdminPreview = process.env.NEXT_PUBLIC_USE_MOCK_DB === "true"
  && process.env.NEXT_PUBLIC_ENABLE_QA_TOOLS === "true";
const kpiDataEnvironment = process.env.NEXT_PUBLIC_KPI_DATA_ENV === "production"
  ? "production"
  : "preview";
const kpiDataEnvironmentLabel = kpiDataEnvironment === "production" ? "Production" : "Preview";

function jstToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function periodRange(periodType: PeriodType, selectedDate: string) {
  if (periodType !== "monthly") {
    return { start: selectedDate, end: addDays(selectedDate, 1) };
  }
  const [year, month] = selectedDate.slice(0, 7).split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  return { start, end: next.toISOString().slice(0, 10) };
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatMetric(row: Snapshot) {
  if (row.value_status === "not_applicable") return "N/A";
  if (row.value == null) return "—";
  const value = Number(row.value);
  if (row.metric_id === "tutorial.completion_rate" || row.metric_id.startsWith("retention.")) {
    return `${(value * 100).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}%`;
  }
  if (row.metric_id === "revenue.gross" || row.metric_id === "revenue.arppu" || row.metric_id === "revenue.arpu") {
    return `¥${value.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
  }
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
}

function metricLabel(row: Snapshot) {
  if (row.metric_id.startsWith("retention.d")) {
    return `D${Number(row.metric_id.slice("retention.d".length))} 継続率`;
  }
  return metricLabels[row.metric_id] || row.metric_id;
}

function dimensionLabel(row: Snapshot) {
  const guildId = row.dimension_key?.guild_id;
  if (guildId) return `Guild ${String(guildId).slice(0, 8)}`;
  return null;
}

function mockSnapshots(category: Category, periodType: PeriodType, date: string): Snapshot[] {
  const ids = category === "acquisition"
    ? ["user.new_anonymous", "user.new_authenticated", "user.new_total", "tutorial.completion_rate"]
    : category === "active_retention" && periodType === "cohort"
      ? [1, 2, 3, 4, 5, 6, 7, 14, 21, 30, 60].map((day) => `retention.d${String(day).padStart(2, "0")}`)
      : category === "active_retention"
        ? [periodType === "monthly" ? "active.mau" : "active.dau"]
        : category === "guild"
          ? ["guild.valid_count", "guild.active_count", "guild.member_count"]
          : category === "content"
            ? ["gacha.free10.character", "gacha.free10.skill", "gacha.free10.equipment"]
            : ["revenue.pu", "revenue.gross", "revenue.arppu", "revenue.arpu"];
  const now = new Date().toISOString();
  return ids.map((metricId, index) => {
    const isRate = metricId.startsWith("retention.") || metricId === "tutorial.completion_rate";
    const notApplicable = category === "revenue";
    const dimensionKey: Record<string, string | number> = metricId === "guild.member_count"
      ? { date, guild_id: "7b83f4c2-preview" }
      : { date };
    return {
      run_id: "qa-preview",
      metric_id: metricId,
      dimension_key: dimensionKey,
      value: notApplicable ? null : isRate ? Math.max(.18, .74 - index * .045) : [148, 51, 199, 27][index % 4],
      numerator: notApplicable ? null : isRate ? Math.max(18, 74 - index * 4) : [148, 51, 199, 27][index % 4],
      denominator: isRate ? 100 : null,
      value_status: notApplicable ? "not_applicable" : index === 0 ? "provisional" : "final",
      null_reason: notApplicable ? "payment_closed" : null,
      calculated_at: now,
      source_watermark: now,
      finished_at: now,
    };
  });
}

export default function KpiDashboard() {
  const [access, setAccess] = useState<AccessState>(mockAdminPreview ? "admin" : "loading");
  const [category, setCategory] = useState<Category>("acquisition");
  const [periodType, setPeriodType] = useState<PeriodType>("daily");
  const [selectedDate, setSelectedDate] = useState(jstToday);
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(true);

  const allowedPeriods = useMemo<PeriodType[]>(() => {
    if (category === "active_retention") return ["daily", "monthly", "cohort"];
    if (category === "guild") return ["daily"];
    return ["daily", "monthly"];
  }, [category]);
  const range = useMemo(() => periodRange(periodType, selectedDate), [periodType, selectedDate]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mockAdminPreview) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (!user) setAccess("signed-out");
      else if (user.app_metadata?.role === "admin") setAccess("admin");
      else setAccess("denied");
    });
    return () => { active = false; };
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (access !== "admin") return;
    setLoading(true);
    setMessage(null);
    if (mockAdminPreview) {
      setRows(mockSnapshots(category, periodType, range.start));
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_latest_kpi_snapshots", {
      p_category: category,
      p_period_type: periodType,
      p_period_start: range.start,
      p_period_end: range.end,
    });
    if (error) {
      setRows([]);
      setMessage(`読込に失敗しました: ${error.message}`);
    } else {
      setRows((data || []) as Snapshot[]);
    }
    setLoading(false);
  }, [access, category, periodType, range.end, range.start]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSnapshots(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSnapshots]);

  const selectCategory = (nextCategory: Category) => {
    setCategory(nextCategory);
    if (nextCategory === "guild" || (nextCategory !== "active_retention" && periodType === "cohort")) {
      setPeriodType("daily");
    }
  };

  const refresh = async () => {
    if (isMobile || access !== "admin") return;
    setRefreshing(true);
    setMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setMessage("セッションを確認できません。再ログインしてください。");
      setRefreshing(false);
      return;
    }
    const response = await fetch("/api/admin/kpi/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category, periodType, periodStart: range.start, periodEnd: range.end }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result.error || "更新に失敗しました。");
    else if (result.status !== "succeeded") setMessage(result.errorDetail || "集計が完了しませんでした。");
    else {
      setMessage("スナップショットを更新しました。");
      await loadSnapshots();
    }
    setRefreshing(false);
  };

  const loginWithGoogle = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("return_to", "/admin/kpi");
    rememberOAuthReturnTo("/admin/kpi");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (error) {
      window.localStorage.removeItem(OAUTH_RETURN_INTENT_KEY);
      setLoginError(error.message);
      setLoginLoading(false);
    }
  };

  if (access !== "admin") {
    return (
      <main className="kpi-shell kpi-access-shell">
        <section className="kpi-access-card">
          <span className="kpi-kicker">TRIBE NEON / {kpiDataEnvironment.toUpperCase()}</span>
          <h1>KPI Control Room</h1>
          {access === "loading" && <p>権限を確認しています…</p>}
          {access === "signed-out" && <>
            <p>管理者アカウントでログインしてください。</p>
            <button className="kpi-google-login" type="button" onClick={() => void loginWithGoogle()} disabled={loginLoading}>
              {loginLoading ? "Googleへ接続中…" : "Googleでログイン"}
            </button>
            {loginError && <p className="kpi-login-error" role="alert">{loginError}</p>}
          </>}
          {access === "denied" && <p>この画面は運営管理者専用です。</p>}
        </section>
      </main>
    );
  }

  const selectedCategory = categories.find((item) => item.id === category)!;
  const lastUpdated = rows[0]?.finished_at;
  const provisionalCount = rows.filter((row) => row.value_status === "provisional").length;

  return (
    <main className="kpi-shell">
      <header className="kpi-header">
        <div>
          <span className="kpi-kicker">TRIBE NEON / {kpiDataEnvironment.toUpperCase()}</span>
          <h1>KPI Control Room</h1>
          <p>集客 → ゲーム開始 → 定着 → ギルド形成 → 課金</p>
        </div>
        <div className="kpi-header-meta">
          <span className="kpi-live-dot" /> {kpiDataEnvironmentLabel} DB
          <small>最終更新 {formatTimestamp(lastUpdated)}</small>
        </div>
      </header>

      <nav className="kpi-funnel" aria-label="KPIカテゴリ">
        {categories.map((item, index) => (
          <button
            key={item.id}
            className={category === item.id ? "is-active" : ""}
            onClick={() => selectCategory(item.id)}
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      <section className="kpi-toolbar" aria-label="集計条件">
        <div className="kpi-title-block">
          <span>{selectedCategory.eyebrow}</span>
          <h2>{selectedCategory.label}</h2>
        </div>
        <label>
          集計単位
          <select value={periodType} onChange={(event) => setPeriodType(event.target.value as PeriodType)}>
            {allowedPeriods.map((period) => <option key={period} value={period}>{period === "daily" ? "デイリー" : period === "monthly" ? "マンスリー" : "コホート"}</option>)}
          </select>
        </label>
        <label>
          対象{periodType === "monthly" ? "月" : "日"}
          <input
            type={periodType === "monthly" ? "month" : "date"}
            value={periodType === "monthly" ? selectedDate.slice(0, 7) : selectedDate}
            onChange={(event) => setSelectedDate(periodType === "monthly" ? `${event.target.value}-01` : event.target.value)}
          />
        </label>
        <button className="kpi-reload" type="button" onClick={() => void loadSnapshots()} disabled={loading}>
          {loading ? "読込中" : "再読込"}
        </button>
        {!isMobile && (
          <button className="kpi-refresh" type="button" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? "集計中…" : "このカテゴリを更新"}
          </button>
        )}
      </section>

      <section className="kpi-status-strip">
        <div><span>対象期間</span><strong>{range.start} — {range.end}</strong></div>
        <div><span>指標数</span><strong>{rows.length}</strong></div>
        <div><span>暫定値</span><strong>{provisionalCount}</strong></div>
        <div><span>取得元</span><strong>保存済みSnapshot</strong></div>
      </section>

      {message && <div className="kpi-message" role="status">{message}</div>}
      {isMobile && <div className="kpi-mobile-notice">モバイルは閲覧専用です。更新はPCから実行してください。</div>}

      <section className="kpi-grid" aria-busy={loading}>
        {!loading && rows.length === 0 && (
          <div className="kpi-empty">
            <span>NO SNAPSHOT</span>
            <h3>この期間はまだ集計されていません</h3>
            <p>PCの「このカテゴリを更新」からスナップショットを生成してください。</p>
          </div>
        )}
        {rows.map((row) => (
          <article className="kpi-card" key={`${row.metric_id}-${JSON.stringify(row.dimension_key)}`}>
            <div className="kpi-card-head">
              <div>
                <small>{dimensionLabel(row) || row.metric_id}</small>
                <h3>{metricLabel(row)}</h3>
              </div>
              <span className={`kpi-status kpi-status-${row.value_status}`}>{statusLabels[row.value_status]}</span>
            </div>
            <strong className="kpi-value">{formatMetric(row)}</strong>
            {(row.numerator != null || row.denominator != null) && (
              <div className="kpi-fraction">
                <span>分子 {row.numerator?.toLocaleString("ja-JP") ?? "—"}</span>
                <span>分母 {row.denominator?.toLocaleString("ja-JP") ?? "—"}</span>
              </div>
            )}
            <footer>
              <span>{row.null_reason ? `理由: ${row.null_reason}` : "snapshot確定値"}</span>
              <time>{formatTimestamp(row.calculated_at)}</time>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
