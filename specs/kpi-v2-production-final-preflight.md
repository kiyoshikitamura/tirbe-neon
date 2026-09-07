# KPI Dashboard V2 — Production Release Final Preflight

Date: 2026-09-07 JST.

Status: **BLOCKED — Production release not executed.**

The database migration and accepted M2/M3 surfaces are technically deployable in the required order, but the current release candidate has two pre-release conditions: the fixed Formal Open rules are not reflected in the API/UI, and the Production-data KPI branch does not currently own the Basic-auth variables. No Production migration, deployment, refresh, environment change, feature-state change or data write was performed.

## Approved release scope

1. `20260906000249_kpi_authority_extensions.sql`
2. M2 acquisition/tutorial/identity runtime instrumentation and Guild trigger integration
3. V2 read API and Marketing manual/import API
4. M3 read-only KPI Dashboard V2

Excluded: Production KPI refresh, historical backfill, subject merge, Retention rewrite, feature-state mutation, Payment/GvG/Shop/Special Gacha opening and automatic Formal Open operations.

## Production database preflight

- Project: `ktpolnkyyfkowxdmijww` (verified from the Supabase Production project URL).
- Migration head: `20260905000248`.
- 00249 ledger rows: 0.
- Required dependency relations: 10/10.
- 00249 conflicts: relations/views 0, functions 0, triggers 0.
- Pending/running KPI aggregation runs: 0.
- Release baseline: subjects 41; daily activity 49; guild membership periods 6; guild members 6; board posts 13; aggregation runs 129; metric snapshots 557; feature-state rows 26.
- Repository migration SHA-256: `a7804a3300171d0d2a8fdddb57cda31f2e3811f32a952e9c8e60e2662a308ee0`.
- Migration contents: 12 tables, 4 security-invoker views, 12 functions, 2 triggers; RLS and explicit grants; no backfill; no existing KPI object replacement; no feature-state write.

00249 is applicable to Production. Expected lock scope is catalog writes plus brief DDL locking while triggers are added to `guild_members` and `board_posts`, and dependency locks for foreign keys/views. Current table volumes are small, but application latency and lock waiting must still be observed during the transaction.

## Code and build preflight

- `verify_kpi_v2_m2_contract.mjs`: PASS.
- `verify_kpi_fixed_domain_contract.mjs`: PASS.
- TypeScript: PASS.
- Optimized build using `NEXT_PUBLIC_APP_ENV=preview`, `NEXT_PUBLIC_KPI_DATA_ENV=production` and the exact standard Production Supabase origin: PASS.
- The V2 dashboard performs GET-only reads. Marketing import is a separate intentional admin POST. No release/payment/GvG/shop/special-gacha controls exist.
- `/admin/kpi` and `/api/admin/kpi/*` remain behind the fail-closed Basic-auth proxy. Missing credentials return 503; absent/invalid credentials return 401.
- The runtime validator accepts Production KPI data only when the application remains a Preview environment and the exact origin is `https://ktpolnkyyfkowxdmijww.supabase.co`.

## Release blockers

### P1 — Fixed Formal Open specification is not implemented

The current validation API returns `formal_open_status: UNAVAILABLE` with reason `decision_tolerance_and_community_continuity_not_defined`. The current UI also says multiple-cohort treatment and community continuity are undefined. Those statements are now obsolete.

Before Production release, an additive application follow-up must implement and test:

- Retention identity = `subject_id`; account switches are diagnostic only and never merged.
- For each D1-D5, the latest three mature cohorts, UU-weighted as `sum(retained UU) / sum(Game Start UU)`.
- Fewer than three mature cohorts for any Dn = `NOT_READY`.
- Exact thresholds D1 38%, D2 30%, D3 26%, D4 23%, D5 21%.
- Effective Active Guild >= 18 for three consecutive completed JST days.
- Overall GO only when Marketing, Acquisition, Tutorial, Guild Chat Activation, D1-D5 and Community all pass; missing observations produce NOT READY and mature eligible misses produce FAIL.
- Decision support only; never mutate `feature_operating_states`.

### P1 — Production-data branch currently lacks Basic-auth scope

The Production Supabase URL, anon key, service-role key and `NEXT_PUBLIC_KPI_DATA_ENV` remain scoped to Preview branch `codex/kpi-dashboard-production-20260904`. The existing Basic-auth variables are currently scoped to `codex/kpi-v2-m2-preview` after the Preview 503 remediation. A Production-data deployment from the former branch would therefore fail closed with 503 until the existing Basic-auth variable scopes are moved back (without revealing/changing their values), or an equivalent dedicated release-branch scope is configured.

The Production-data branch is at `429f3ac`; the accepted M3 source is at `8d107a7`. The release branch must be fast-forwarded/synchronized to the final approved commit before deployment.

## Exact release sequence after approval

1. Implement the Formal Open evaluator/copy delta, rerun M2/M3 contracts, TypeScript, build and mobile acceptance, and freeze the release commit plus 00249 SHA.
2. Synchronize the dedicated Production-data KPI branch to that frozen commit without deploying it yet.
3. Repeat the Production READ ONLY DB preflight. Stop if head is not 00248, 00249 exists, any object conflict appears, the migration hash changes, or a KPI aggregation is running.
4. Apply 00249 once through the normal migration mechanism in one transaction. Do not refresh or backfill.
5. Postflight: head/history 00249 exactly once; 12 tables with RLS, 4 views, 12 functions and 2 triggers; expected grants/search paths; all new fact tables initially empty; preflight baselines unchanged except migration/catalog state.
6. Move or configure the existing Basic-auth variables for the dedicated Production-data KPI branch without revealing values. Verify the branch-specific Production URL/data-environment/service-role variables are present and generic Preview values are overridden.
7. Deploy the frozen application commit to that Vercel Preview branch. Reject any bundle that does not contain only the exact Production Supabase origin.
8. Confirm anonymous `/admin/kpi` and admin API access is 401/no-store, then perform Human Acceptance of `/admin/kpi`: data-environment label, empty/NOT READY semantics, funnels, Retention maturity, Community continuity and Formal Open Decision Support.
9. Observe application errors and writer duplication. Do not run KPI refresh. Do not create synthetic Production facts unless separately approved and excluded by canonical QA authority.

## Rollback / forward-fix

- Before the migration commits: rollback the transaction; do not deploy.
- After 00249 commits but before application deploy: leave additive empty objects in place and stop. Do not drop them.
- Application defect: roll the dedicated KPI branch deployment back to the prior application commit. 00249 remains additive and dormant; existing gameplay continues.
- Instrumentation defect after live facts exist: disable by application rollback and preserve facts. Correct with a new additive migration/application forward fix; never rewrite or delete history.
- Environment-scope defect: restore the previous branch scopes and redeploy; never reveal or rotate credentials as part of rollback unless independently required.
- Dashboard/GO must never trigger feature-state mutation, so no Gameplay/Payment/GvG rollback is expected from this release.

## Go/no-go

Database: **GO after repeat preflight and explicit Production approval.**

Application release candidate: **NO-GO until the two P1 conditions above are closed.**

Production changes performed by this preflight: **NONE.**
