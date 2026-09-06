import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const TIMEZONE = "Asia/Tokyo";
export const DEFINITION_VERSION = "kpi-v2-20260906";
export type MetricStatus = "PASS" | "FAIL" | "NOT_READY" | "UNAVAILABLE";

type Period = { subject_id: string; classification: string; valid_from: string; valid_to: string | null };
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>) {
  const result: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    const rows = data || [];
    result.push(...rows);
    if (rows.length < 1000) return result;
  }
}

export function noStore(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co") || parsed.pathname !== "/") return null;
  } catch { return null; }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function validDate(value: string | null) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function rangeFrom(request: NextRequest) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const defaultFrom = addDays(today, -29);
  const from = request.nextUrl.searchParams.get("from") || defaultFrom;
  const to = request.nextUrl.searchParams.get("to") || today;
  if (!validDate(from) || !validDate(to) || from > to || diffDays(from, to) > 366) return null;
  return { from, to, fromAt: `${from}T00:00:00+09:00`, toAt: `${addDays(to, 1)}T00:00:00+09:00`, today };
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function diffDays(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function jstDate(timestamp: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(timestamp));
}

async function exclusions(service: SupabaseClient): Promise<Period[]> {
  const { data, error } = await service.from("kpi_account_classification_periods")
    .select("subject_id,classification,valid_from,valid_to")
    .in("classification", ["admin", "qa", "test", "fraud_suspended"]);
  if (error) throw error;
  return (data || []) as Period[];
}

function excluded(periods: Period[], subjectId: string, at: string) {
  const value = Date.parse(at);
  return periods.some((period) => period.subject_id === subjectId
    && Date.parse(period.valid_from) <= value
    && (!period.valid_to || Date.parse(period.valid_to) > value));
}

export function metric(metricKey: string, numerator: number | null, denominator: number | null, target: number | null,
  options: { pass?: boolean; observationStatus?: string; reason?: string | null; asOf?: string; coverage?: unknown } = {}) {
  const value = numerator == null || denominator == null || denominator === 0 ? null : numerator / denominator;
  const passed = options.pass ?? (target != null && value != null && value >= target);
  const status: MetricStatus = options.observationStatus === "incomplete" || denominator === 0
    ? "NOT_READY"
    : value == null ? "UNAVAILABLE"
      : passed ? "PASS" : "FAIL";
  return {
    metric_key: metricKey, definition_version: DEFINITION_VERSION, numerator, denominator, value, target,
    status, coverage: options.coverage ?? null, observation_status: options.observationStatus || "complete",
    as_of: options.asOf || new Date().toISOString(), timezone: TIMEZONE,
    reason: denominator === 0 ? "zero_denominator" : options.reason || null,
  };
}

export function scalarMetric(metricKey: string, value: number | null, target: number | null,
  options: { pass?: boolean; status?: MetricStatus; reason?: string | null; asOf?: string; coverage?: unknown } = {}) {
  const status: MetricStatus = options.status ?? (value == null ? "NOT_READY" : (options.pass ?? (target != null && value >= target)) ? "PASS" : "FAIL");
  return {
    metric_key: metricKey, definition_version: DEFINITION_VERSION, numerator: null, denominator: null,
    value, target, status, coverage: options.coverage ?? null,
    observation_status: value == null ? "incomplete" : "complete",
    as_of: options.asOf || new Date().toISOString(), timezone: TIMEZONE,
    reason: value == null ? options.reason || "no_data" : options.reason || null,
  };
}

export async function acquisition(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>) {
  const titleRows = await fetchAll<{ journey_id: string; occurred_at: string }>((from, to) => service.from("kpi_acquisition_journey_facts")
    .select("journey_id,occurred_at").eq("event_type", "TITLE_ARRIVED")
    .gte("occurred_at", range.fromAt).lt("occurred_at", range.toAt).range(from, to));
  const ids = [...new Set(titleRows.map((row) => row.journey_id))];
  if (!ids.length) return { metric: metric("acquisition.game_start_rate", 0, 0, 0.8), journeys: { started_at: null, last_fact_at: null, bound: 0, unbound: 0 } };
  const [{ data: journeys }, { data: bindings }, { data: allFacts }] = await Promise.all([
    service.from("kpi_acquisition_journeys").select("journey_id,started_at,source").in("journey_id", ids),
    service.from("kpi_acquisition_subject_bindings").select("journey_id,subject_id,bound_at").in("journey_id", ids),
    service.from("kpi_acquisition_journey_facts").select("journey_id,occurred_at").in("journey_id", ids).order("occurred_at", { ascending: false }),
  ]);
  const accepted = new Set(((journeys || []) as any[]).filter((row) => row.source !== "qa_v1").map((row) => row.journey_id));
  const acceptedBindings = ((bindings || []) as any[]).filter((row) => accepted.has(row.journey_id));
  const subjectIds = [...new Set(acceptedBindings.map((row) => row.subject_id))];
  const { data: subjects } = subjectIds.length
    ? await service.from("kpi_subjects").select("subject_id,registered_at").in("subject_id", subjectIds)
    : { data: [] as any[] };
  const periods = await exclusions(service);
  const subjectById = new Map(((subjects || []) as any[]).map((row) => [row.subject_id, row]));
  const excludedBoundJourneys = new Set(acceptedBindings.filter((binding) => {
    const subject = subjectById.get(binding.subject_id);
    return !subject?.registered_at || excluded(periods, binding.subject_id, binding.bound_at || subject.registered_at);
  }).map((row) => row.journey_id));
  const acceptedIds = ids.filter((id) => accepted.has(id) && !excludedBoundJourneys.has(id));
  const numerator = new Set(acceptedBindings
    .filter((row) => acceptedIds.includes(row.journey_id) && subjectById.get(row.subject_id)?.registered_at)
    .map((row) => row.journey_id)).size;
  const facts = ((allFacts || []) as any[]).filter((row) => accepted.has(row.journey_id));
  return {
    metric: metric("acquisition.game_start_rate", numerator, acceptedIds.length, 0.8),
    journeys: {
      started_at: ((journeys || []) as any[]).filter((row) => accepted.has(row.journey_id)).map((row) => row.started_at).sort()[0] || null,
      last_fact_at: facts.map((row) => row.occurred_at).sort().at(-1) || null,
      bound: numerator, unbound: acceptedIds.length - numerator,
    },
  };
}

export async function tutorial(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>) {
  const subjectData = await fetchAll<any>((from, to) => service.from("kpi_subjects").select("subject_id,registered_at")
    .gte("registered_at", range.fromAt).lt("registered_at", range.toAt).range(from, to));
  const periods = await exclusions(service);
  const subjects = subjectData.filter((row) => !excluded(periods, row.subject_id, row.registered_at));
  const ids = subjects.map((row) => row.subject_id);
  const { data: completionData } = ids.length
    ? await service.from("kpi_canonical_tutorial_completions_v1").select("subject_id,completed_at").in("subject_id", ids)
    : { data: [] as any[] };
  const completed = new Set(((completionData || []) as any[]).map((row) => row.subject_id));
  return { metric: metric("tutorial.canonical_complete_rate", completed.size, ids.length, 0.6), strong_target: 0.7 };
}

export async function guild(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>) {
  const { data: completionData } = await service.from("kpi_canonical_tutorial_completions_v1")
    .select("subject_id,completed_at").gte("completed_at", range.fromAt).lt("completed_at", range.toAt).limit(100000);
  const periods = await exclusions(service);
  const tutorialSubjects = new Set(((completionData || []) as any[])
    .filter((row) => !excluded(periods, row.subject_id, row.completed_at)).map((row) => row.subject_id));
  const ids = [...tutorialSubjects];
  const { data: conversionData } = ids.length
    ? await service.from("kpi_guild_conversion_facts").select("subject_id,conversion_type,membership_period_id,occurred_at").in("subject_id", ids)
    : { data: [] as any[] };
  const conversions = ((conversionData || []) as any[]).filter((row) => !excluded(periods, row.subject_id, row.occurred_at));
  const conversionSubjects = new Set(conversions.map((row) => row.subject_id));
  const periodsIds = [...new Set(conversions.map((row) => row.membership_period_id))];
  const { data: activationData } = periodsIds.length
    ? await service.from("kpi_guild_chat_activation_facts").select("subject_id,membership_period_id,occurred_at").in("membership_period_id", periodsIds)
    : { data: [] as any[] };
  const activationSubjects = new Set(((activationData || []) as any[])
    .filter((row) => !excluded(periods, row.subject_id, row.occurred_at)).map((row) => row.subject_id));
  return {
    conversion: metric("guild.conversion_rate", conversionSubjects.size, tutorialSubjects.size, 0.4),
    conversion_strong_target: 0.6,
    chat_activation: metric("guild.chat_activation_rate", activationSubjects.size, conversionSubjects.size, 0.3),
    create: new Set(conversions.filter((row) => row.conversion_type === "CREATE").map((row) => row.subject_id)).size,
    join: new Set(conversions.filter((row) => row.conversion_type === "JOIN").map((row) => row.subject_id)).size,
  };
}

export async function retention(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>) {
  const subjectData = await fetchAll<any>((from, to) => service.from("kpi_subjects").select("subject_id,registered_at")
    .gte("registered_at", range.fromAt).lt("registered_at", range.toAt).range(from, to));
  const periods = await exclusions(service);
  const subjects = subjectData.filter((row) => !excluded(periods, row.subject_id, row.registered_at));
  const ids = subjects.map((row) => row.subject_id);
  const { data: activityData } = ids.length
    ? await service.from("kpi_daily_user_activity").select("subject_id,activity_date,last_active_at").in("subject_id", ids)
      .gte("activity_date", range.from).lte("activity_date", addDays(range.to, 5)).limit(200000)
    : { data: [] as any[] };
  const active = new Set(((activityData || []) as any[])
    .filter((row) => !excluded(periods, row.subject_id, row.last_active_at)).map((row) => `${row.subject_id}:${row.activity_date}`));
  const targets = [0, .38, .30, .26, .23, .21];
  const cohorts = [...new Set(subjects.map((row) => jstDate(row.registered_at)))].sort().map((cohortDate) => {
    const cohort = subjects.filter((row) => jstDate(row.registered_at) === cohortDate);
    return {
      cohort_date: cohortDate,
      game_start_uu: cohort.length,
      days: [1, 2, 3, 4, 5].map((day) => {
        const observationDate = addDays(cohortDate, day);
        const mature = observationDate < range.today;
        const numerator = mature ? cohort.filter((row) => active.has(`${row.subject_id}:${observationDate}`)).length : null;
        return { day, ...metric(`retention.d${day}`, numerator, mature ? cohort.length : null, targets[day], { observationStatus: mature ? "complete" : "incomplete" }) };
      }),
    };
  });
  const { count: transitionCount, error: transitionError } = await service.from("kpi_subject_identity_transition_facts")
    .select("id", { count: "exact", head: true }).eq("transition_type", "ACCOUNT_SWITCH_TO_EXISTING")
    .gte("occurred_at", range.fromAt).lt("occurred_at", range.toAt);
  if (transitionError) throw transitionError;
  return { cohorts, identity: "subject_id", account_switch_diagnostic_count: transitionCount || 0 };
}

export async function community(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>) {
  const [{ data: effective, error }, { data: chat }] = await Promise.all([
    service.from("kpi_effective_active_guild_daily_v1").select("activity_date,guild_id,game_active_members,guild_chat_active_members,is_active_guild,is_effective_active_guild")
      .gte("activity_date", range.from).lte("activity_date", range.to).order("activity_date"),
    service.from("kpi_guild_daily_chat_activity_v1").select("activity_date_jst,guild_id,chat_active_uu,message_count")
      .gte("activity_date_jst", range.from).lte("activity_date_jst", range.to).order("activity_date_jst"),
  ]);
  if (error) throw error;
  const rows = (effective || []) as any[];
  const dates = [...new Set(rows.map((row) => row.activity_date))];
  return { target: 18, continuity_status: "UNAVAILABLE", reason: "community_continuity_period_not_defined", series: dates.map((date) => ({
    date,
    active_guild_count: rows.filter((row) => row.activity_date === date && row.is_active_guild).length,
    effective_active_guild_count: rows.filter((row) => row.activity_date === date && row.is_effective_active_guild).length,
    guild_active_uu: rows.filter((row) => row.activity_date === date).reduce((sum, row) => sum + Number(row.game_active_members || 0), 0),
    guild_chat_active_uu: (chat || []).filter((row: any) => row.activity_date_jst === date).reduce((sum: number, row: any) => sum + Number(row.chat_active_uu || 0), 0),
    guild_chat_message_count: (chat || []).filter((row: any) => row.activity_date_jst === date).reduce((sum: number, row: any) => sum + Number(row.message_count || 0), 0),
  })) };
}

export async function marketing(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>, grain: string | null) {
  let query = service.from("kpi_marketing_latest_revisions_v1").select("*")
    .gte("report_date_jst", range.from).lte("report_date_jst", range.to).order("report_date_jst");
  if (grain) query = query.eq("reporting_grain", grain);
  const { data, error } = await query.limit(100000);
  if (error) throw error;
  const rows = (data || []) as any[];
  const grains = [...new Set(rows.map((row) => row.reporting_grain))];
  if (!grain && grains.length > 1) return { status: "UNAVAILABLE", reason: "INVALID_GRAIN_MIX", grains, rows: [] };
  return { status: rows.length ? "PASS" : "NOT_READY", reason: rows.length ? null : "no_data", grain: grain || grains[0] || null, rows };
}

export async function validation(service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>, grain: string | null) {
  const [acquisitionResult, tutorialResult, guildResult, marketingResult] = await Promise.all([
    acquisition(service, range), tutorial(service, range), guild(service, range), marketing(service, range, grain),
  ]);
  let marketingDays: unknown[] = [];
  if (marketingResult.status !== "UNAVAILABLE") {
    const grouped = new Map<string, { spend: number; impressions: number; clicks: number }>();
    for (const row of marketingResult.rows as any[]) {
      if (row.currency !== "JPY") continue;
      const current = grouped.get(row.report_date_jst) || { spend: 0, impressions: 0, clicks: 0 };
      current.spend += Number(row.spend || 0);
      current.impressions += Number(row.impressions || 0);
      current.clicks += Number(row.clicks || 0);
      grouped.set(row.report_date_jst, current);
    }
    marketingDays = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, totals]) => {
      const cpc = totals.clicks === 0 ? null : totals.spend / totals.clicks;
      const ctr = totals.impressions === 0 ? null : totals.clicks / totals.impressions;
      const cpm = totals.impressions === 0 ? null : totals.spend * 1000 / totals.impressions;
      return {
        date,
        cpc: scalarMetric("marketing.cpc", cpc, 28.5, { pass: cpc != null && cpc <= 28.5, reason: cpc == null ? "zero_denominator" : null }),
        clicks: scalarMetric("marketing.clicks", totals.clicks, 350),
        ctr: scalarMetric("marketing.ctr", ctr, 0.007, { reason: ctr == null ? "zero_denominator" : null }),
        cpm: scalarMetric("marketing.cpm", cpm, null, { status: cpm == null ? "NOT_READY" : "UNAVAILABLE", reason: cpm == null ? "zero_denominator" : "no_gate_threshold" }),
        gate_status: cpc != null && cpc <= 28.5 && totals.clicks >= 350 ? "PASS" : "FAIL",
      };
    });
  }
  return {
    definition_version: DEFINITION_VERSION, timezone: TIMEZONE, as_of: new Date().toISOString(),
    acquisition: acquisitionResult.metric,
    tutorial: tutorialResult.metric,
    guild_conversion: guildResult.conversion,
    guild_chat_activation: guildResult.chat_activation,
    marketing: marketingResult.status === "UNAVAILABLE"
      ? { status: "UNAVAILABLE", reason: marketingResult.reason, days: [] }
      : { status: marketingDays.length ? "AVAILABLE" : "NOT_READY", reason: marketingDays.length ? null : "no_jpy_data", days: marketingDays },
    formal_open_status: "UNAVAILABLE",
    formal_open_reason: "decision_tolerance_and_community_continuity_not_defined",
  };
}

export async function respond(request: NextRequest, loader: (service: SupabaseClient, range: NonNullable<ReturnType<typeof rangeFrom>>) => Promise<unknown>) {
  const service = serviceClient();
  const range = rangeFrom(request);
  if (!service) return noStore({ error: "KPI server configuration unavailable" }, 503);
  if (!range) return noStore({ error: "Invalid JST date range" }, 400);
  try { return noStore(await loader(service, range)); }
  catch (error) { console.error("KPI V2 read failed", error); return noStore({ error: "KPI authority unavailable" }, 500); }
}
