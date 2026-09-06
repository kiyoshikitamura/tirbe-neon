# KPI Dashboard V2 M3 status

Date: 2026-09-06 JST. No Production migration, deployment, refresh, data write, or feature-state change was performed.

## M2

Status remains `BLOCKED — authenticated HTTP acceptance only`. Implementation, Preview DB acceptance, build, Preview deployment, unauthenticated 401, no-store, and persistent KPI non-contamination remain accepted. The protected GET route parity and latency run still requires the Preview KPI Basic-auth credential.

## M3 implementation

- `/admin/kpi` now opens a read-only Validation V2 view while preserving the existing Legacy Snapshot view and its APIs behind an explicit version switch.
- Sections: Validation Status, Current Release Gate, Marketing, Acquisition Funnel, Tutorial Funnel, Post Tutorial Activation, Guild Funnel, Retention Cohort, Community, Formal Open Readiness, and GvG/Monetization/Mission shells.
- V2 performs GET-only requests. It has no release-state, payment, GvG, shop, special-gacha, refresh, or Formal Open write controls.
- Marketing requires an explicit reporting grain. Campaign names wrap rather than widening the viewport. Gate, Target, and Strong criteria are separate.
- Acquisition uses bound Game Start journeys / Title Arrival journeys. Tutorial uses only `FIRST_MYPAGE_ACCESS_CONFIRMED`; legacy COMPLETE is not used as the canonical numerator.
- Post-tutorial presentation maps `SKILL_NORMAL` to スキルガチャ and `EQUIP_NORMAL` to 装備ガチャ. Character remains unavailable because a canonical activation mapping is not fixed; Battle/Raid use post-canonical-completion lifetime milestone timestamps.
- Retention renders immature cells as `— / NOT READY`, never 0%. Formal Open remains NOT READY while tolerance and continuity rules are unspecified.

## Local acceptance

- TypeScript: PASS.
- Production build with exact Preview project origin: PASS.
- Existing KPI fixed-domain contract: PASS.
- Existing M2 instrumentation/read contract: PASS.
- Playwright at 390×844 and 412×915: PASS. Page-wide horizontal overflow is absent; only the Retention table scrolls horizontally.
- Fixture acceptance: populated data, long campaign name, mature/incomplete Retention, NOT READY/UNAVAILABLE, Marketing empty/zero-denominator equivalent, and partial API error with retry UI: PASS.
- Existing `/admin/kpi` Legacy Snapshot component and `/api/admin/kpi/{timeseries,snapshots,refresh}` implementations were not changed.

## Remaining Preview acceptance

Deploy this M3 commit to the dedicated branch target whose bundle contains `https://sufvuqdnqohpfzkwxohq.supabase.co`, then repeat desktop/mobile visual checks. Authenticated live-data checks remain part of the M2 blocker rather than a UI design blocker.

## Remaining specification gaps

1. Account-switch Retention attribution.
2. Formal Open approximate-threshold tolerance and multiple-cohort treatment.
3. Community continuity period.
