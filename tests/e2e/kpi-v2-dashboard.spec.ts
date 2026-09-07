import { expect, test, type Page } from "@playwright/test";

const metric = (key: string, numerator: number | null, denominator: number | null, value: number | null, target: number | null, status = "PASS") => ({
  metric_key: key, definition_version: "kpi-v2-20260906", numerator, denominator, value, target, status,
  coverage: { from: "2026-08-08", to: "2026-09-06" }, observation_status: value == null ? "incomplete" : "complete",
  as_of: "2026-09-06T12:00:00+09:00", timezone: "Asia/Tokyo", reason: value == null ? "no_data" : null,
});
const fixtures: Record<string, unknown> = {
  validation: {
    acquisition: metric("acquisition.game_start_rate", 84, 100, .84, .8), tutorial: metric("tutorial.canonical_complete_rate", 62, 84, .738, .6),
    guild_conversion: metric("guild.conversion_rate", 30, 62, .484, .4), guild_chat_activation: metric("guild.chat_activation_rate", 11, 30, .367, .3),
    marketing: { status: "AVAILABLE", days: [{ cpc: metric("marketing.cpc", null, null, 18.2, 28.5), clicks: metric("marketing.clicks", null, null, 420, 350) }] },
    formal_open: { status:"GO", reasons:[], retention:Object.fromEntries([1,2,3,4,5].map((day) => [`d${day}`, { ...metric(`formal_open.retention.d${day}`, 30, 75, .4, [0,.38,.3,.26,.23,.21][day]), mature_cohort_count:3, cohorts_used:["2026-08-31","2026-09-01","2026-09-02"] }])), effective_active_guild:{ status:"PASS", target:18, required_consecutive_days:3, current_consecutive_days:3, daily_series:[] } },
  },
  acquisition: { metric: metric("acquisition.game_start_rate", 84, 100, .84, .8), journeys: { bound: 84, unbound: 16 }, steps: [
    ["TITLE_ARRIVED",100], ["TAP_TO_START",94], ["WORLD_INTRO_STARTED",91], ["WORLD_INTRO_COMPLETED",88], ["NAME_COMPLETED",85], ["GAME_START_BOUND",84],
  ].map(([event_type, journeys]) => ({ event_type, journeys })) },
  tutorial: { metric: metric("tutorial.canonical_complete_rate",62,84,.738,.6), strong_target:.7, steps: [
    ["GAME_START",84,"complete"], ["TUTORIAL_GACHA_COMPLETED",78,"partial"], ["TUTORIAL_BATTLE_COMPLETED",72,"partial"], ["AUTH_CHOICE_SELECTED",68,"partial"], ["AUTH_CHOICE_RESOLVED",65,"partial"], ["FIRST_MYPAGE_ACCESS_CONFIRMED",62,"complete"],
  ].map(([fact_type, subjects, observation_status]) => ({ fact_type, subjects, observation_status })) },
  guild: { conversion: metric("guild.conversion_rate",30,62,.484,.4), conversion_strong_target:.6, chat_activation: metric("guild.chat_activation_rate",11,30,.367,.3), create:8, join:22 },
  retention: { identity:"subject_id", account_switch_diagnostic_count:2, cohorts:[{ cohort_date:"2026-09-03", game_start_uu:20, days:[
    metric("retention.d1",8,20,.4,.38), metric("retention.d2",6,20,.3,.3), metric("retention.d3",null,null,null,.26,"NOT_READY"), metric("retention.d4",null,null,null,.23,"NOT_READY"), metric("retention.d5",null,null,null,.21,"NOT_READY"),
  ].map((value, index) => ({ day:index+1,...value })) }] },
  community: { target:18, continuity_status:"PASS", effective_active_guild:{ status:"PASS", target:18, required_consecutive_days:3, current_consecutive_days:3, daily_series:[] }, series:[{ date:"2026-09-06", guild_active_uu:78, active_guild_count:22, guild_chat_active_uu:31, guild_chat_message_count:146, effective_active_guild_count:19 }] },
  marketing: { status:"PASS", grain:"CAMPAIGN", rows:[{ id:"m1", report_date_jst:"2026-09-06", reporting_grain:"CAMPAIGN", campaign_name:"TRIBE NEON 正式オープン前Validation・とても長いキャンペーン名称・モバイル折返し確認用", external_key:"long", spend:7644, impressions:60000, clicks:420, ctr:.007, cpc:18.2, cpm:127.4 }] },
  "post-tutorial": { cohort:62, metrics:[{key:"SKILL_NORMAL",label:"スキルガチャ",uu:44},{key:"EQUIP_NORMAL",label:"装備ガチャ",uu:39},{key:"CHARACTER",label:"Character",uu:null,observation_status:"unavailable"},{key:"BATTLE",label:"Battle",uu:48},{key:"RAID",label:"Raid",uu:27}] },
};

async function mockApi(page: Page, options: { empty?: boolean; fail?: string } = {}) {
  await page.route("**/api/admin/kpi/v2/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (options.fail === key) return route.fulfill({ status: 500, contentType: "application/json", headers: { "Cache-Control": "no-store" }, body: JSON.stringify({ error: "fixture failure" }) });
    let body = fixtures[key];
    if (options.empty && key === "marketing") body = { status:"NOT_READY", reason:"no_data", grain:"CAMPAIGN", rows:[] };
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Cache-Control":"no-store" }, body: JSON.stringify(body) });
  });
}

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Basic ${Buffer.from("m3:local-only").toString("base64")}` });
});

for (const viewport of [{ width:390, height:844 }, { width:412, height:915 }]) {
  test(`KPI V2 mobile ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport); await mockApi(page); await page.goto("/admin/kpi");
    await expect(page.getByRole("heading", { name:"Validation Status" })).toBeVisible();
    await expect(page.getByText("SKILL_NORMAL", { exact:true })).toBeVisible();
    await expect(page.getByText("GO", { exact:true }).first()).toBeVisible();
    await expect(page.getByText(/とても長いキャンペーン名称/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const retention = page.locator(".v2-retention-scroll");
    expect(await retention.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  });
}

test("KPI V2 empty and partial API error states", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 }); await mockApi(page, { empty:true, fail:"community" }); await page.goto("/admin/kpi");
  await expect(page.locator(".v2-alert")).toContainText("community");
  await expect(page.getByText(/Marketing source dataがありません/)).toBeVisible();
  await expect(page.getByRole("heading", { name:"Formal Open Readiness" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
