# Ranking / Power P0 Foundation

更新日: 2026-08-17

本書は `spec_ranking.md`、`spec_mission.md`、`product_decisions.md` に残る旧実装記述のうち、Ranking / Power、日次境界、Season契約について上書きする。バランス値およびランキング報酬は本工程の対象外とする。

## Main Formation

- Main FormationはPvP攻撃・PvP防衛・Raid・GvG・Quest・Tutorialの各編成から独立する。
- 既存の通常「編成」UIはMain Formationを編集する。
- 1ユーザーにつきslot 1〜5、同一所持キャラクターの重複は禁止する。
- 保存は `save_main_formation(text[])` のみで行い、所有権をserver-sideで検証する。
- 空編成は許可し、総合力を0として保存する。
- PvP Defenseは既存の独立契約を維持する。

## Total Power

- 総合力はMain Formationに含まれる所持キャラクター1〜5体の最終HP + ATK + DEFの合計とする。
- SPD、LUK、Friend Helper、Skill/Passiveの非数値効果は含めない。
- 装備が直接付与するHP/ATK/DEFは、確定済み装備Lv曲線・限界突破補正を反映する。
- クライアント再計算値は正規値に使用しない。
- `user_power_rankings.total_power` はserver projectionであり、consumerから直接変更できない。
- Main Formation、キャラクターLv/覚醒、装備/ロードアウト/Lv/限界突破、関連Master変更時に再計算する。

## Ranking

- 個人総合力: server projectionを順位付けする。Dailyは当日00:00 JST以降にactiveなユーザーのみ。
- Guild総合力: 所属メンバーのserver Power合計。Dailyは当日activeなメンバーのみ。平均値は使用しない。
- PvP Daily: 00:00〜翌00:00 JSTの勝利数。Seasonは正規rank_points。
- Raid Daily: boss instanceごとの `get_raid_rankings(instance_id)`。Seasonは明示Season期間内の複数instanceを個人/Guild別に集計する。
- GvG Guild: Season単位のGuild rate。旧daily_points、season_points、勝利+250/敗北-100はproduction read pathで使用しない。
- GvG Individual: 勝利補正前の実与ダメージをSeason累積する。
- C〜Sのrate閾値は未確定であり、値を推測して実装しない。

## Daily Boundary

- 日次境界はすべて00:00 JSTとする。
- 対象: Daily Ranking、PvP Daily、Guild Power Daily、Daily Mission、Login Bonus、Daily Free Gacha、Raid Daily Attempt、日次報酬判定。
- Raid instanceの24時間終了など、content instance固有windowは日次境界と分離する。
- 「過去24時間active」は使用せず、JST calendar dateを使用する。

## Season

- `ranking_seasons` を共通正本とし、`season_id / ranking_type / starts_at / ends_at / status` を保持する。
- 対象typeは `POWER / GUILD_POWER / PVP / RAID / GVG`。
- 初回を含め期間はserver dataとして設定可能とし、clientは暦月・週を推測しない。
- UIは `get_active_ranking_seasons()` の開始・終了を表示する。
- Reward値・配布は未実装であり、Production Economy工程で決定する。

## Public Read Contract

- Ranking UIはread-only RPCを画面表示時に取得し、全ユーザーdatasetをclient集計しない。
- Player Detailはusername、avatar、bio、level、Guild公開情報、total power、Main Formationの公開Master ID/表示情報のみ返す。
- `user_characters.id`、装備/Skill build、inventoryその他owner dataは公開しない。
- paginationは最大100件、offsetは0〜10000とする。

## Security

- 公開RPCは `SECURITY DEFINER / search_path=public / authenticated only`。
- `user_power_rankings`、`user_main_formations`、`ranking_seasons`、各ranking projection、Raid raw logs、PvP/GvG source tablesはconsumer直接mutation不可。
- PvP ranking tableの直接SELECTは廃止し、RPCのみとする。
- GvG match/logは既存画面のためRLS-scoped SELECTを維持するが、mutationは拒否する。
- Guild baseの公開表示は `get_public_guild_base_controls()` を使用し、退役済みdaily pointsは公開しない。

## Implementation References

- `supabase/migrations/20260817000154_ranking_power_p0_foundation.sql`
- `supabase/migrations/20260817000155_jst_midnight_daily_contract.sql`
- `supabase/migrations/20260817000156_ranking_source_table_lockdown.sql`
- `supabase/migrations/20260817000157_retire_direct_pvp_ranking_policy.sql`
- `supabase/migrations/20260817000158_public_guild_base_snapshot.sql`
- `supabase/postflight/20260817000154_ranking_power_p0_foundation_postflight.sql`
- `supabase/postflight/20260817000155_jst_midnight_daily_contract_postflight.sql`
- `supabase/postflight/20260817000156_ranking_source_table_lockdown_postflight.sql`
