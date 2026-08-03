# Skill / equipment master progress (2026-08-03)

- Applied `20260805000004_skill_equipment_gacha_seed.sql` to the linked development project only. Pool counts: SKILL_NORMAL 35, SKILL_SPECIAL 40, EQUIP_NORMAL 141, EQUIP_SPECIAL 157.
- Applied `20260805000005_asset_gacha_rpc.sql`; verified `execute_asset_gacha(uuid,text,integer,text)` exists with `SECURITY DEFINER`.
- Updated `GameContext.handleScout` to use the server-side asset draw RPC for skill/equipment pulls. `npx tsc --noEmit` passes.
- Verified each asset pool has unique item IDs and positive configured weights; no duplicate pool rows were found.
- Existing ESLint issues remain outside the migration scope (the latest full `npm.cmd run lint` reports 665 errors / 156 warnings, mostly pre-existing `any` and hook-dependency issues); these are tracked separately from the gacha migration.
- Added `npm run verify:asset-gacha`, an opt-in authenticated smoke test. It only verifies that the asset RPC rejects an invalid pull count and does not consume currency or grant items.
- Smoke test execution against the development project reached Supabase Auth but was rejected with `invalid_credentials`; no RPC call or data mutation occurred. The test account/password must be verified or reset in the development project before retrying.
- Registered the requested test account in the development project via Supabase Auth (`userId` recorded in the Auth response). No session was issued, indicating email confirmation is required before the smoke test can sign in.
- Added and applied `20260805000006_user_characters_identity_index.sql`; this fixes the existing `initialize_new_user` conflict target mismatch. The test account was initialized successfully, and one free `SKILL_NORMAL` pull completed successfully (`SKILL_024`, outcome `new`, balances unchanged at 10,000 cash / 200 diamonds).
- The same authenticated test user completed one free `EQUIP_NORMAL` pull successfully (`ACCESSORY_012`, outcome `new`); the item was verified in `user_equipments`.
- The test user completed one paid cash `SKILL_NORMAL` pull successfully (`SKILL_004`, outcome `new`); cash decreased from 10,000 to 9,000 and the skill row was verified in `user_skills`.
- Forced a development-only duplicate case by temporarily weighting `SKILL_004`, then restored its original weight. The paid pull returned `outcome: limit_break`, reduced cash to 8,000, and increased `plus_val` to 1.
- Forced the same skill to `plus_val=10` and verified the cap conversion path: paid pull returned `outcome: converted`, reduced cash to 7,000, and added 2 `TRAINING_MANUAL` items. The pool weight was restored afterward.
- Verified ticket consumption with one test-issued `GACHA_TICKET`: `EQUIP_NORMAL` returned `BODY_002` and ticket quantity decreased to 0.
- Verified diamond consumption: `SKILL_NORMAL` returned the expected capped conversion and diamonds decreased from 200 to 100.
- Verified insufficient-balance handling: zero tickets returned `insufficient gacha tickets`, and 100 diamonds attempting `SKILL_SPECIAL` returned `insufficient gacha currency`; both calls failed before granting or charging.
- Verified character normal free pull: `CHAR_NORMAL` returned a new character (`a0000000-0000-0000-0000-000000000011`) and the record was saved with `awakening_level=0`.
- Forced a character duplicate case and verified `outcome: awakening`; `awakening_level` increased to 1. Then forced the same character to level 5 and verified `outcome: converted` with 1 `LAW_OF_STRIFE` granted. The character pool weight was restored afterward.
- Verified `CHAR_SPECIAL` cash pull: a new character was returned, cash decreased to 2,000, and `pity_special_common.current_points` increased to 1. A second same-day free character pull was rejected with `daily free gacha already claimed`.
- Verified 10-pull insufficient-balance handling: `CHAR_NORMAL` with `p_pull_count=10` and insufficient cash was rejected before any draw or charge. Client-side cost constants remain aligned at 10x single-pull price for normal/special pulls.
- Verified RPC input authorization: another user ID returned `not authorized`, and an invalid gacha ID returned `asset gacha not found`; neither operation changed data.
- Replenished only the development test user's cash and completed a `CHAR_NORMAL` 10-pull: exactly 10 results were returned (new/awakening/converted outcomes) and cash decreased 10,000 → 0.
- Added `exchange_pity_reward` as an atomic, auth-checked RPC and switched the frontend pity exchange path to it. A development test exchange of `SKILL_004` returned `converted` and increased `TRAINING_MANUAL` by 2; TypeScript checks remain green.
- Replenished the development test user's cash and completed a `SKILL_NORMAL` 10-pull: exactly 10 results returned and cash decreased 10,000 → 0, including a duplicate `limit_break` outcome.
- Replenished cash again and completed an `EQUIP_NORMAL` 10-pull: exactly 10 equipment results returned and cash decreased 10,000 → 0; duplicate equipment IDs were stored as separate draws.
- Replenished cash and completed a `SKILL_SPECIAL` 10-pull: exactly 10 results returned, cash decreased 30,000 → 0, and shared pity increased by 10 points.
- Replenished cash and completed an `EQUIP_SPECIAL` 10-pull: exactly 10 equipment results returned, cash decreased 30,000 → 0, and shared pity increased 10 more points (total 20).
- Verified pity exchange rejects insufficient points and invalid reward IDs; the test user's pity was reset to 0 after validation.
- Aligned both character and asset gacha RPCs with the specification that daily free pulls are 10-pulls only; a free 1-pull now returns `free gacha requires 10 pulls`.
- Verified unauthenticated calls to `execute_asset_gacha` and `exchange_pity_reward` both return `not authorized` without changing data.
- Added `get_public_battle_loadout` and switched friend-helper loading in `useBattle.ts` to the limited RPC response. The RPC was verified with the development test user; TypeScript checks pass.
- Added and verified `get_public_battle_roster` for future PvP/GvG opponent loading. It returns only character, equipped equipment, and equipped skill fields (no currency or inventory).
- Switched the PvP opponent roster loading in `useBattle.ts` to `get_public_battle_roster`; TypeScript and diff checks pass.
- Added `get_public_battle_roster_by_character_ids` and switched the GvG defense roster loading to it; TypeScript and diff checks pass.
- Added `get_public_leader_characters` and switched guild member leader-character lookup to the limited RPC; TypeScript and diff checks pass.
- Applied `20260805000012_owner_rls_user_assets.sql`: `user_characters`, `user_skills`, `user_equipments`, and `user_items` now require `auth.uid() = user_id`. Authenticated self-read and public battle-loadout RPC were verified successfully.
- Added and verified `get_public_profiles`, which exposes only username/avatar/bio/favorite character for future public profile and guild UI migration.
- Switched guild member profile loading in `GameContext.tsx` from a direct `users` join to `get_public_profiles`; TypeScript and diff checks pass.
- Switched GvG personal ranking profile loading in `RankingTab.tsx` to `get_public_profiles`; TypeScript and diff checks pass.
- Switched friend list and friend request profile loading in `useFriends.ts` to `get_public_profiles`; TypeScript and diff checks pass.
- Added `users.last_active_at` and `sync_active_users` RPC after finding the column missing in the development schema; authenticated online-count sync now returns successfully.
- Added `get_user_setup_status` and switched setup detection in `GameContext.tsx` from direct `users` lookup to the RPC; TypeScript and diff checks pass.
- Applied owner-only RLS to `users`. During verification, corrected the public profile RPC to use schema-compatible default friend fields; authenticated self-read and public profile response now both succeed.
- Fixed remaining post-RLS other-user lookups (PvP opponent name, player detail, guild leader name) by switching them to `get_public_profiles`; TypeScript and diff checks pass.
- Switched PvP ranking profile loading in `GameContext.tsx` to `get_public_profiles`; TypeScript and diff checks pass.
- Added `get_public_power_rankings` and switched the overall power ranking aggregation to its limited public response; TypeScript and diff checks pass.
- Switched raid damage log username loading to `get_public_profiles`; TypeScript and diff checks pass.
- Verified the new RLS blocks direct reads for a different user ID (0 rows returned) while preserving authenticated self-read.
- Added `.github/workflows/quality.yml` to require npm install, TypeScript, and build checks on pushes and pull requests. Lint remains a separately tracked legacy issue.
- Added the `npm run typecheck` script and aligned the CI workflow and deployment guide to use it.
- Confirmed PostgreSQL 17 Client Tools were installed (PATH未登録) and used `pg_dump` via the Supabase pooler to create `supabase/baseline_dev_schema.sql` without Docker. The dump is schema-only and targets the development project.
- Also created `supabase/baseline_dev_schema.dump` in custom format and validated its TOC with `pg_restore --list` (700 entries).
- Confirmed the local PostgreSQL 17 service (`postgresql-x64-17`) is running; no restore was executed because the baseline is retained as a rollback/reference artifact and production release is out of scope.
- Re-ran `npm.cmd run typecheck` and `npm.cmd run build` successfully after the migration/RPC changes.
- `npm.cmd run verify:asset-gacha` is ready for Preview/Development smoke checks, but was not run in this shell because the four Supabase test variables are intentionally not stored in local env files.
- `npx --yes supabase migration list --linked` was rechecked with the temporary CLI runner; local migrations are listed but the remote column remains empty, confirming the development database is still outside normal migration-history tracking. No `db push` was performed.
- Started the built Next.js application on a temporary local port and confirmed `GET /` returned HTTP 200; the process was stopped after the smoke check.
- Ran `npm.cmd run verify:asset-gacha` with test credentials supplied only as process-scoped environment variables; development Supabase authentication succeeded and invalid pull-count validation was rejected as expected.
- Read-only Supabase checks confirmed all 8 major public RPCs exist (`execute_*_gacha`, pity exchange, public profiles/rankings/roster, activity/setup helpers) and all 58 public tables currently have RLS enabled.
- RLS policy aggregate recheck returned 61 policies, with 48 broad `USING/WITH CHECK (true)` policies remaining; the count is lower than the initial audit and the remaining policies are still tracked for a later, feature-by-feature hardening pass.
- Applied development migration `20260805000020_owner_rls_user_progress.sql` for five `user_id`-owned tables; the broad-policy count decreased to 43. `user_power_rankings` remains deferred because public ranking reads still require its RPC path.
- Added `npm.cmd run verify:owner-rls` and confirmed the authenticated anon client can query the five owner-scoped tables without exposing rows for a foreign UUID.
- Fixed a discovered `user_power_rankings` schema mismatch: the database column is `total_power`, while the RPC/client used `current_power`. Migration `20260805000021_fix_power_ranking_column.sql` now aliases `total_power` as `current_power` in the public RPC, and client writes/reads use `total_power`.
- Updated `specs/development_rules.md` and `specs/spec_ranking.md` so the documented schema matches the development database (`total_power`).
- Extended `verify:owner-rls` to call `get_public_power_rankings`; the authenticated RPC smoke test passed after the column fix.
- Re-ran the optimized Next.js build after the ranking/RLS changes; compilation, TypeScript validation, and static generation all succeeded.
- Applied `20260805000022_owner_rls_user_invitations.sql` so invitation rows are limited to inviter/invitee; broad-policy count is now 42.
- Applied `20260805000023_split_rls_user_power_rankings.sql`; ranking rows remain publicly readable for ranking screens, while INSERT/UPDATE/DELETE require `auth.uid() = user_id`.
- Applied `20260805000024_owner_rls_payments_presents.sql` for user-owned payment and present records; broad-policy count is now 40.
- Expanded `verify:owner-rls` to seven tables (including payments/presents); authenticated foreign-UUID checks and the public ranking RPC still pass.
- Confirmed the provided Vercel Preview URL `https://tirbe-neon.vercel.app/` responds with HTTP 200 and the expected page title `TRIBE: NEON REIGN`; no authenticated actions or data mutations were performed.
- Preview static asset check found 7 script references; the first 3 JavaScript chunks all returned HTTP 200.
- Preview headers include HSTS and standard cache/content type headers; `x-frame-options` and `x-content-type-options` were not present, so adding explicit security headers remains a Preview hardening candidate before production release.
- Added explicit `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers in `next.config.ts`; typecheck and optimized build both pass.
- Removed build-time and runtime Google Fonts dependencies from `layout.tsx`/`globals.css`; `npm run build` now succeeds without network font fetching.
- Production release remains out of scope; controlled rollout follows baseline reconciliation.

# 開発・移行状況メモ

最終確認: 2026-08-03

## プロジェクト構成

- Framework: Next.js 16 + TypeScript
- Package manager: npm
- Main entry: `src/app/page.tsx`
- Development: `npm run dev -- --hostname 127.0.0.1 --port 3000`
- Production build: `npm run build`
- DB migration source of truth: `supabase/migrations/`

## 検証済みの現状

- 作業ツリーはクリーンである。
- `npm run lint` は未通過（最新実行: 665 errors / 156 warnings）。主な対象は `src/utils/mock/mockRpc.ts`、`src/app/context/GameContext.tsx`、`src/app/components/RankingTab.tsx`。
- `npm run build` は、`next/font/google` がGeistフォントを取得できない環境では失敗する。外部取得に依存しない構成への変更が必要である。
- 自動テストファイルは未整備である。
- Supabase CLIで開発プロジェクト `tribe-neon-dev` へ接続できた。
- `migration list --linked` ではローカルmigrationのみが表示され、リモート側の適用バージョンは表示されなかった。さらに `_supabase_migrations.schema_migrations` は存在しなかったため、既存開発DBはmigration管理外で手作業構築された可能性が高い。既存DBへ `db push` を直接実行してはいけない。
- 開発DBにはpublicテーブルが56個存在し、RLSポリシーは61件、そのうち53件が `USING (true)` または `WITH CHECK (true)` に該当した。
- 開発DBのpublic RPCは17種類（オーバーロードを含む）で、ローカルmigrationが定義する機能群と一致していない。
- `initialize_new_user` は開発DBに存在するが、引数がローカル実装（`p_user_id, p_name`）と異なり、8引数の実装である。`execute_gacha`、PvP/GvG/レイド結果処理、献金・拠点占領RPCなどは開発DBのpublic関数一覧では確認できなかった。
- `20260805000000_dev_rpc_reconciliation.sql` の4 RPC（献金、PvP結果、レイドダメージ、GvG結果）を、既存開発DBへCLIの読み取り・SQL実行経路で適用した。登録後の関数引数と `SECURITY DEFINER` を確認済み。リモートmigration履歴は引き続き未登録のため、適用記録は本メモで管理する。
- `20260805000001_dev_gacha_charge_rpc.sql` の `execute_gacha`（通貨の原子的引き落とし）を開発DBへ適用し、関数定義と `SECURITY DEFINER` を確認済み。報酬付与のサーバー抽選化は次段階で実施する。
- `20260805000002_character_gacha_rpc.sql` の `execute_character_gacha` を開発DBへ適用し、キャラクター抽選、無料回数、通貨消費、重複覚醒、上限時素材変換、スペシャル天井加算をRPCへ移管した。`GameContext` のキャラクターガチャ経路もこのRPCを利用するよう変更した。
- `20260805000003_pvp_opponents_rpc.sql` の `get_pvp_opponents` を開発DBへ適用した。本人除外、近いレート帯、最大5件、登録済み防衛デッキの返却をRPC側で行う。
- TypeScript検査（`npx tsc --noEmit`）は成功した。

## 移行上の注意

- 本移行は既存の開発環境を対象とし、本番リリース・本番データ移行は実施しない。
- ルート直下の `setup_schema.sql` および `migration_*.sql` は過去の手作業適用用ファイルであり、新規環境構築の正本には使用しない。
- 新規環境では `supabase/migrations/` を番号順に適用する。適用前に対象環境のmigration historyと差分を必ず確認する。
- `.env`、`.env.local`、`.env.development`、`.env.production` が存在する。値をログ・コミット・ドキュメントへ転載しない。
- 本番化前にRLS、RPCの所有者検証、テスト用RPCの公開状態を監査する。詳細は `specs/implementation_plan.md` を参照する。
