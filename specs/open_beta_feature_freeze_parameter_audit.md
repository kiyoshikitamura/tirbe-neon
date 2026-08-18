# Open Beta Feature Freeze Parameter Audit

監査日: 2026-08-13

この文書はOpen Beta中に調整し得る数値の正本と、Balance Polishでの確認対象を示す。`CONFIRMED` は確定仕様、`PROVISIONAL` は差し替え可能な暫定マスタ、`NEEDS_BALANCE_TEST` は実プレイ計測後に判断する値を表す。

| 対象 | 状態 | 現在の正本 | 変更方法・注意 |
| --- | --- | --- | --- |
| 初期ユーザー状態 / 初期XP | NEEDS_BALANCE_TEST | `initialize_current_player` migration / `users` defaults | 初期導線E2Eと同時に変更する。クライアントから指定不可 |
| First PvP後の一度限りXP | PROVISIONAL / NEEDS_BALANCE_TEST | `record_official_battle_milestones` | `first_pvp` milestoneの初回だけLv5到達に必要な差分をサーバー計算 |
| User level curve | NEEDS_BALANCE_TEST | `user_level_master` | DB master更新。First PvP補正と解放条件を同時確認 |
| AP上限 / 回復 | NEEDS_BALANCE_TEST | `users.vitality_max` / recovery RPC（300秒） | 上限はユーザー行、回復間隔はmigration内。変更時はRPC migrationと表示定数を同時更新 |
| Quest AP・時間・報酬 | NEEDS_BALANCE_TEST | `quests` | DB masterを正とし、開始・報酬RPCはDB値を参照 |
| Character growth cost | PROVISIONAL / NEEDS_BALANCE_TEST | progression master tables | DB master差し替え可能。クライアントから費用指定不可 |
| Equipment / Skill growth cost | PROVISIONAL / NEEDS_BALANCE_TEST | progression master tables | DB master差し替え可能。クライアントから費用・素材指定不可 |
| Equipment battle curve | CONFIRMED | `equipment_level_battle_curve` | Lv1=10%、Lv50=60%、Lv100=100% |
| PvP point上限 / 回復 | NEEDS_BALANCE_TEST | `start_pvp_battle`（上限5、3600秒） | サーバー正。変更時はRPC migrationが必要 |
| PvP報酬 | PROVISIONAL / NEEDS_BALANCE_TEST | `pvp_match_rewards_master` | 基本報酬はDB master。rank差補正はfinalize RPC migration |
| PvP rank変動 | PROVISIONAL / NEEDS_BALANCE_TEST | `finalize_pvp_battle` | server-authoritative。変更時はRPC migration |
| Raid拠点数 / cycle | CONFIRMED | Raid lifecycle RPC | 毎日ランダム2拠点、各24時間 |
| Raid挑戦回数 / 費用 | PROVISIONAL / NEEDS_BALANCE_TEST | `raid_attempt_cost_master` | 10段階をDB master化。UIは`get_current_raid_attempt_state()`を参照 |
| Raid Boss parameter | PROVISIONAL / NEEDS_BALANCE_TEST | `raid_boss_master` | instance生成時にsnapshot。開催中instanceは値を固定 |
| Raid報酬 / Ranking | PROVISIONAL / NEEDS_BALANCE_TEST | Raid reward/rank master + finalize RPC | クライアント指定不可。変更は新cycleへの影響を確認 |
| Mission条件 / 報酬 | PROVISIONAL / NEEDS_BALANCE_TEST | `mission_master` | 既存18件、funnel 6件、invite 10件は差し替え可能 |
| Friend Invitation報酬 | PROVISIONAL / NEEDS_BALANCE_TEST | `mission_master` + invitation RPC | invitee初回100 Diamond、inviterは10段階mission。重複付与不可 |
| Login Bonus | PROVISIONAL / NEEDS_BALANCE_TEST | `login_bonus_master` | 30日cycle、JST日付をサーバー判定 |
| Guild Recommendation weight | PROVISIONAL / NEEDS_BALANCE_TEST | `guild_recommendation_weights` | DB更新で差し替え可能。管理画面/A-Bは対象外 |
| Normal Gacha価格 / 無料回数 | CONFIRMED | `gacha_price_master` | 毎日10連1回無料。JST日付をサーバー判定 |
| Character Gacha roster / rarity weight | PROVISIONAL / NEEDS_BALANCE_TEST | character gacha pool/master | 暫定60体。排出率・poolはDB master差し替え可能 |
| Skill battle definitions | PROVISIONAL / NEEDS_BALANCE_TEST | `skill_battle_master` | executable 50、placeholder 20 disabled。差し替え可能 |

## 分散定義の扱い

- Raid挑戦費用・回数は今回 `raid_attempt_cost_master` と状態RPCへ集約し、UI固定値を廃止した。
- Quest、Gacha、Mission、Login Bonus、Recommendation、育成費用は既存DB masterを正とする。
- AP回復間隔、PvP回復・rank差補正はserver-authoritativeだがRPC内固定値である。Open Beta中に変更する場合は、migrationとクライアント表示定数を同一変更として扱う。現時点では機能不成立や二重付与を起こさないためFeature Freeze後の設定基盤拡張は行わない。
- UIへ数値を再直書きせず、利用可能なRPC response / master readを優先する。

## Balance Polish優先順

1. First PvP到達時のLv5到達率と初回XP量
2. Raid完走率、無料3回以降の費用、Boss HP・報酬
3. AP枯渇時間、Quest報酬、育成素材供給
4. PvP point回復、rank変動、報酬
5. Mission / Login Bonus / Invitation報酬
6. Gacha roster・排出分布と成長停滞率
7. Recommendation weightとActive Guild Density
