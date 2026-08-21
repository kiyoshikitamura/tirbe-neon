# TRIBE NEON — ギルドLevel / XP / Member Cap / Buff / Activity Production Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

## 1. 上位仕様

- Guild加入・検索・RecommendationはUser Lv8未満でも利用可能。
- Guild設立解放はUser Lv8。
- Guild初期Member Cap = 10。
- Guild成長で最大20名。
- Guild LevelはActivity蓄積で成長。
- Guild Level差だけでGvG勝敗が決まる強いCombat Buffは禁止。
- Guildの主な成長価値はMember Cap / Community成長 / Prestige。
- RaidはGuild専用ではない。Guild所属者のRaid ContributionのみGuild側にも加算。
- GvGはGuildの主要End Content。

## 2. Guild Level

初期ProductionはLv1〜5。

| Guild Lv | Member Cap | HP Bonus | ATK Bonus | DEF Bonus |
|---|---:|---:|---:|---:|
| 1 | 10 | 0% | 0% | 0% |
| 2 | 12 | +1% | 0% | 0% |
| 3 | 14 | +1% | +1% | +1% |
| 4 | 17 | +2% | +1% | +1% |
| 5 | 20 | +2% | +2% | +2% |

旧15→17→20→22→25人は廃止。

旧最大ATK/HP+10%級Buffも廃止。

## 3. Guild Buff計算

Guild BuffはBattle中Buff Groupへ入れない。

計算順:
1. Character Level/Awakening stat
2. Guild PreBattle Bonus
3. Equipment Flat / Equipment %
4. Battle開始
5. Skill/Status等Battle Modifier

例:
Character ATK 50,000
Guild ATK +2%
→ Guild反映後51,000

Equipment %はCharacter Stat基準というEquipment Contractを維持するため、
実装時にGuild補正後値をEquipment %の「Character Stat」とするかはBattle Calculatorで一意化する。

Production推奨:
**Guild BonusはCharacter base layerへ含めた後、Equipment計算へ進む。**

## 4. Guild XP Curve

| Level Up | Required Guild XP | Cumulative |
|---|---:|---:|
| Lv1→2 | 1,000 | 1,000 |
| Lv2→3 | 2,500 | 3,500 |
| Lv3→4 | 6,000 | 9,500 |
| Lv4→5 | 12,000 | 21,500 |

狙い:
Active 10人Guild:
- Lv2 D1〜2
- Lv3 D3〜5
- Lv4 D7〜10
- Lv5 D14〜21

Guild XPは人数が増えるほど自然に加速するが、
一人のHeavy Userだけで短期間にLv5へ上げられないようDaily Capを設ける。

## 5. Guild XP Source

MemberごとのDaily Contribution。

| Activity | Guild XP | Member Daily Cap |
|---|---:|---:|
| Login | 10 | 1 |
| Guild Chat有効投稿 | 10 | 1 |
| Quest 3回達成 | 10 | 1 |
| PvP 1回 | 10 | 1 |
| Raid 1回 | 15 | 1 |
| Donation | 20 | 1 |
| GvG参加 | 30 | 各開催1回、最大3/day |
| GvG勝利Bonus | 20 | 各開催1回 |

通常日、GvGを除く1Member最大:
**75 Guild XP/day**

10 Active:
750/day。

GvG日最大:
参加90 + 勝利最大60を追加可能。

このため21,500 XPは、Member増加とGvG Activity込みで約2〜3週間を想定。

## 6. Chat XP Anti-Abuse

ChatはCommunityに重要だが、発言数比例にしない。

Guild XP対象:
- その日の最初の有効Guild Chat投稿のみ
- 空文字/Sticker only/システム投稿は対象外
- 削除済み投稿でも一度獲得したXPを巻き戻さない
- 連投で追加XPなし

ChatをしないとGuild成長できないほど大きい値にも設定しない。

## 7. Donation

DonationはGuild Activityの一部。

初期Production提案:
1日1回のBasic Donationを基本。

Basic:
- 5,000 CASH
- Guild XP +20

Advanced Donation等のDiamond Donationは初期Productionでは追加しないことを推奨。

理由:
Guild Levelを直接Diamond購入で加速すると、
Guild Buff/GvGへ課金が二重に効くため。

将来追加する場合もDaily Cap必須。

## 8. Donation Reward

DonationしたMember本人:
- Guild Contribution Point等の新通貨は初期には作らない。
- Mission進捗
- Guild XP Contribution表示

だけで成立させる。

Guild Shopを将来導入する場合にGuild Currencyを追加検討。

初期Productionで不要な通貨を増やさない。

## 9. Guild Activity Score

Recommendation/検索用ActivityはGuild XPと分離。

`guild_activity_score`は直近7日で計算。

候補Signal:
- 7日Active Member率
- Guild Chat投稿Member率
- Raid参加Member率
- PvP/GvG参加
- 新規Member受入
- 直近Login

Guild XP総量だけで「おすすめGuild」を決めない。
古参高LvだがInactiveなGuildを上位推薦しないため。

## 10. Recommendation

初期Customer Journeyで3〜5 Guildを推薦。

優先:
1. 空き枠あり
2. 直近7日Active率
3. Member在籍率
4. Guild Activity
5. 直近募集状態
6. 同拠点/嗜好等は将来

Guild Levelは補助Signal。

高Lvだけを優先しない。

## 11. Guild Creation

解放:
**User Lv8**

設立時:
- Guild Lv1
- Member Cap10
- Guild XP0
- Leader = creator

設立Cost:
初期Productionでは高額CASHを要求しない。

提案:
**10,000 CASH**

内部換算1,000円相当だがSoft Currency。
初日Quest進行で到達可能な範囲にする。

設立CostはTUNABLE。

## 12. Join / Apply

Lv8未満でも:
- Guild一覧
- Recommendation
- Detail
- Join/Apply
- Guild Chat（加入後）

を利用可能。

Lv8はCreationだけのGate。

Open Guild:
即加入。

Approval Guild:
申請→Leader/Subleader承認。

Full Guild:
Join不可。

## 13. Roles

最低限:
- Leader
- Subleader
- Member

権限:
Leader:
- settings
- approve/kick
- role assign
- disband
- GvG settings

Subleader:
- approve
- recruitment/settings一部
- GvG operation

Member:
- normal activity

役職によるCombat Stat Bonusなし。

## 14. Guild Buff適用条件

Guild加入中のみ。

Battle Snapshot作成時のGuild membershipを使用。

PvP:
攻撃/防衛Snapshotに加入時Bonus反映。

Raid:
Attempt開始時。

GvG:
Battle/Action開始時のauthoritative Guild state。

Guild脱退後:
新しいBattleにはBonusなし。

過去ReplayはSnapshotを維持。

## 15. Guild移籍

Guild hopping対策として、
加入直後のCombat Buff停止期間は初期Productionでは設けない。

理由:
初期Guild形成を阻害するため。

ただしRanking Rewardは既仕様どおり在籍条件を持たせる。

GvG移籍制限はGvG Masterを正とする。

## 16. Guild Level Down

**Guild Levelは下がらない。**

Member減少/InactiveでXPを減らさない。

ただしRecommendation Activity Scoreは下がる。

これによりCommunity資産としてのGuild成長を維持しつつ、
Inactive Guildが推薦上位に残る問題を分離して解決する。

## 17. Member Cap超過

Master変更等でCapを下げても既存Memberを自動Kickしない。

通常運営ではCapを下げない。

もし一時的にMember数 > Cap:
- 新規Join停止
- 既存Member維持
- Cap以下になるまで追加不可

## 18. GvG接続

Quest/GvGは同じVitality Wallet。

Guild XP:
- GvG参加で大きめに加算
- 勝利Bonusは小さめ

「勝てるGuildだけがLevelも急速に上がる」構造を避け、
**参加の方を勝利より高く評価**する。

参加30 / 勝利20。

GvG第3戦終了23:30後:
- Guild XP反映
- Ranking締切00:00
- 残VITでQuest可能

夜間Game Cycleと接続。

## 19. Raid接続

RaidはGuild専用ではない。

Guild所属MemberのAttempt:
- 個人Contribution
- `guild_id_at_attempt`へGuild Contribution

を両方記録。

Guild XPはRaid参加1回/日で+15。
Damage量比例でGuild XPを増やさない。

重課金高Damage Member一人でGuild Levelを引き上げないため。

## 20. PvP接続

PvP参加1回/日でGuild XP+10。

PvP Rating/勝利数をGuild XPへ直接比例させない。

個人競争とGuild Levelを過度に連結しない。

## 21. Reward

Guild Level Up時:
Member全員へ大量Combat素材を配らない。

提案:
Lv2:
- CASH 2,000/member

Lv3:
- Character/Equipment EXP Box

Lv4:
- Special Ticket×1/member

Lv5:
- Special Ticket×1 + Guild称号/Frame（後実装可）

Level Up Rewardは一度のみ。
加入後に過去Level Rewardを遡及取得不可。

これによりGuild hopping reward farmingを防止。

## 22. DB / Master

```text
guild_level_master
- level
- required_total_xp
- member_cap
- hp_bonus_rate
- atk_bonus_rate
- def_bonus_rate
- level_up_reward_bundle_id

guild_xp_action_master
- action_type
- xp
- per_member_daily_cap
- per_event_cap

guilds
- level
- guild_xp

guild_member_daily_activity
- guild_id
- user_id
- activity_date_jst
- action counters
```

Recommendation:
```text
guild_activity_metrics
- active_rate_7d
- chat_member_rate_7d
- raid_member_rate_7d
- gvg_member_rate
- recruitment_state
- calculated_at
```

## 23. UI

Guild Top:
- Guild Lv
- XP bar
- Member `x / cap`
- Next Lv benefits
- Activity
- GvG status
- Raid Guild rank
- Chat

Guild Level detail:
`Lv4 → Lv5`
- 17 → 20 Members
- HP +2%
- ATK +2%
- DEF +2%

Combat Buffを過大に訴求しない。
Member増加を主Benefitとして表示。

Member list:
- Role
- Last Active
- Contribution
- GvG participation等

Contributionを絶対評価の晒しにしすぎないようUI hierarchy注意。

## 24. 運営

TUNABLE:
- Guild XP requirements
- XP action values
- Donation CASH
- Level-up reward
- Recommendation weights

Frozen寄り:
- 10→20 Member
- Lv1〜5初期
- Level downなし
- Combat Buff最大2%
- Activity daily cap
- Raid/PvP damage/rating比例XPなし
- Creation Lv8

監視:
- Guild creation/day
- join rate
- recommended→join conversion
- average members
- active member rate
- days to Lv2/3/4/5
- GvG participation
- inactive guild share
- Guild hopping

## 25. 課金影響

Guild Levelを直接課金で買わせない。

CASH DonationはCASH購入による間接加速があり得るが、
1日1回Capで制御。

Combat Buff最大2%なので、
Guild Lv課金加速がGvGを決定する構造になりにくい。

主な課金価値はCharacter/Skill/Equipment/GvG Resource側へ残す。

## 26. Acceptance

1. Guild Lv1 cap10
2. Lv2 cap12
3. Lv3 cap14
4. Lv4 cap17
5. Lv5 cap20
6. old 25 cap廃止
7. max combat bonus2%
8. Guild buff PreBattle
9. Chat XP once/day
10. Quest XP once/day
11. PvP XP once/day
12. Raid XP once/day
13. Donation once/day
14. GvG participation per session
15. GvG win bonus smaller than participation
16. Guild Level never down
17. join before User Lv8
18. create requires Lv8
19. Raid not Guild-only
20. Recommendation prioritizes activity over level
21. Level reward once
22. past reward no retroactive join claim
23. no role combat bonus
24. Snapshot preserves historical buff
25. Guild XP atomic/idempotent

## 27. 確定状況

### 今回Freeze候補
- Lv1〜5
- Member Cap 10/12/14/17/20
- Combat Buff最大+2%
- Guild XP 1,000/2,500/6,000/12,000
- Activity Daily Cap
- GvG参加重視
- Guild Level downなし
- User Lv8は設立のみ
- Raidは個人参加可能
- RecommendationはActivity優先

### TUNABLE
- 各Guild XP値
- Donation 5,000 CASH
- 設立10,000 CASH
- Level-up Reward

初期プレオープンではGuild Lv2〜4到達速度を実測し、
必要ならXP curveを±20%程度調整する。
