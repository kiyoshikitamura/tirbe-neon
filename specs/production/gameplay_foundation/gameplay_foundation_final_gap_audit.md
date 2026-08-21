# TRIBE NEON — Production Gameplay Foundation 最終Gap Audit
バージョン: 2026-08-21
ステータス: **FINAL AUDIT / PRE-M9 MERGE**

## 1. 結論

Gameplay Foundationの主要設計領域は一周した。

ただし、**この時点で「全P0完全Freeze」とはしない。**
M9へImplementation Migrationとして合流する前に、以下の残Gapを区別する。

- **P0-BLOCKER**: プレオープン前に実装/確定必須
- **P0-TUNABLE**: 構造は確定、数値はSimulation/OBTで±調整可
- **P1**: 本リリース/GvG正式開始前
- **LEGACY CLEANUP**: 旧実装をProduction pathから除去
- **DOCUMENT GAP**: 今回の会話で決めた値を正本へ統合する作業

---

# 2. 完了した設計領域

## Character
- 60体
- Production SSR10
- Attribute
- Growth Pattern
- Awakening +0〜+5
- Skill Slot 3/4/5/5/5/6
- Rarity hierarchy
- Character Level / EXP構造
- Lv100/+5 completion

判定:
**構造FREEZE / 個別60体Gameplay行はDOCUMENT GAP**

## Skill
- 70
- Normal50 / Exclusive20
- SSR全員Exclusive
- SR一部Exclusive
- Duplicateは同一Skill Point
- Manualのみ汎用
- +10=30pt
- Effect/Status Contract

判定:
**構造FREEZE / 一部個別値再転記DOCUMENT GAP**

## Equipment
- 170
- 7 slots
- rarity allocation
- Exclusive10
- Lv1〜100
- LB +0〜+10
- +4%/step
- +3/+5/+10 option milestone
- duplicate instance
- same-equipment LB
- no random option

判定:
**構造FREEZE / 170件Option milestone値はP1寄りDOCUMENT GAP**

## Battle
- K=45000
- Normal Attack80%
- Crit新式
- Status cap/resistance
- Buff stacking
- Cooldown/available_from_round
- AI
- Replay authority

判定:
**P0-BLOCKER実装**

## Quest
- User EXP唯一のSource
- Character/Equipment EXP主供給
- EASY/NORMAL/HARD
- First Clear
- rare Manual/LB
- Awakening Book通常Dropなし
- free/paid skip cap

判定:
**構造FREEZE / reward量P0-TUNABLE**

## Resource
- Quest/GvG VIT共有
- overcap carry
- PvP/Raid個別Point
- Quest skipもVIT消費

判定:
**構造FREEZE / recovery/price P0-TUNABLE**

## PvP
- First Mock
- async PvP
- defense rating変動なし
- matchmaking
- Rating
- Ranking
- dedicated point

判定:
**構造FREEZE / rating値P0-TUNABLE**

## Raid
- Guild非専用
- 2 towns/day
- 24h
- encounter/shared HP分離
- individual/guild contribution
- dedicated point
- ranking

判定:
**構造FREEZE / shared HP等P0-TUNABLE**

## Ranking
- PvP daily/weekly
- Raid individual/guild
- Power individual/guild
- JST00:00
- Present automatic delivery
- tie-break

判定:
**構造FREEZE / reward値P0-TUNABLE**

## Gacha
- 3カテゴリ
- Normal/Special
- Normal100 / Special300
- Normal10/day/category permanent
- Tutorial SSR1
- Special pre-open visible/locked
- Ticket pre-distribution
- 200 spark
- Diamond scarcity

判定:
**構造FREEZE / rarity rate P0-TUNABLE**

## Economy / Reward
- EXP abundant
- Manual18〜25/月
- Generic Equip LB25〜40/月
- Ticket10〜20/月
- Diamond300〜500/月
- Awakening Book scarce
- no Residue/Scrap

判定:
**Supply band FREEZE / source quantity P0-TUNABLE**

## Guild
- Lv1〜5
- 10→12→14→17→20
- max combat buff2%
- XP source/cap
- create Lv8
- join before Lv8
- no level down
- Activity recommendation

判定:
**構造FREEZE / XP curve P0-TUNABLE**

---

# 3. 残るP0-BLOCKER

## A. Canonical Source of Truth統合

現在Repositoryには:
- specs MD
- masters CSV
- TS master data
- Supabase master/seed
- Battle hardcode

が並存。

Implementation前に:
**Canonical Machine Masterを1系統に決定**する必要がある。

推奨:
Reviewed MD → canonical machine master → DB seed/import → generated TS/mock。

手書き二重管理禁止。

## B. Character 60個別Gameplay Master完成

不足:
- rarity
- attribute
- hometown
- growth_pattern
- Lv100/+0 HP/ATK/DEF/SPD/LUK
- exclusive IDs

全60行を今回の確定表から正本化。

推測補完禁止。

## C. Skill70 machine master完成

不足:
- N10確定実数値再転記
- R/SR cooldown/available_from_round
- asset/vfx mapping
- schema effect1/2/3化

## D. Battle Engine Migration

現行旧式:
- K27000
- old crit
- Normal100%
- additive modifier
- old cooldown
- old status
- old AI

を全面Migration。

これは最大のP0実装Blocker。

## E. Character / Equipment Progression RPC

Character:
- xp
- EXP item
- Level Cap
- atomic level-up

Equipment:
- xp
- level scale
- +4% LB
- duplicate instance
- same-item LB
- generic LB

旧1item=1level等を廃止。

## F. Quest Reward / User EXP実装

- User EXPをQuestだけへ限定
- 他featureのUser EXP grantを除去
- reward pool server RNG
- first clear
- skip entitlement
- VIT transaction

## G. PvP/Raid Customer Journey E2E

Tutorial後:
Quest → PvP Mock → Ranking → Raid → Guild
がProduction Masterで完走すること。

---

# 4. 追加で残るP0設計Gap

## 4.1 Shop / Monetization Master

**未完了。**

プレオープン中に課金機能を閉じる場合でも、
UIにShop/購入商品が見えるならLegacy商品を表示してはいけない。

本リリース前には最低限:
- Diamond package
- CASH package
- Energy Drink
- Quest skip payment
- PvP/Raid recovery item販売有無
- Starter Pack
- VIP
- purchase limit
- price
- paid/free currency handling

のMaster監査が必要。

判定:
**プレオープンで購入不可・非表示ならP1**
**購入可能/表示ならP0**

## 4.2 GvG Gameplay / Reward接続

GvG本体は既存仕様があり、今回ゼロから再設計していない。

今回変更した:
- Battle scale
- Shared VIT
- Guild buff
- Ranking reset00:00
- Character/Skill/Equipment stats

がGvGへ影響する。

必要:
- GvG Battle regression
- VIT action cost
- Energy Drink
- shared HP
- 3 sessions
- 23:30 end
- reward
- monthly top battle

判定:
**プレオープンでGvG closedならP1**
ただしUI/Resource接続のLegacy cleanupはP0。

## 4.3 Total Power Formula

総合力Rankingが重要なのに、
新Character/Skill/Equipment Scaleに対する
**Total Power計算式の再Freezeが未完了。**

これはP0。

必要:
- Character stat weight
- Skill awakening contribution
- Equipment stat/passive contribution
- Character awakening
- Guild buffをPowerへ含むか
- Formation Power
- User Total Power
- Guild Total Power

Ranking / matchmaking / UIへ直接影響。

## 4.4 Tutorial Initial Grant Master

Tutorial SSR1は確定だが、
Productionで:
- どのSSRか/選択式か
- 初期Skill
- 初期Equipment
- EXP material
- CASH
- initial VIT
- tutorial entitlement

の完全なInitial Grant Bundleが未統合。

P0。

## 4.5 Item Master正式名称/ID

Legacy:
- ITEM_EXP_DRINK
- ITEM_STAMINA_01
- SKILL_LB_BOOK
- EQUIP_LB_HAMMER
- LAW_OF_STRIFE等

今回の正式Gameplay languageへ統一必要。

P0。

---

# 5. P0-TUNABLE

構造を変えずOpen Betaで調整可能:

- Quest EXP item quantity ±20%
- Quest rare drop
- CASH rewards
- Manual 18〜25帯
- Generic LB25〜40帯
- Ticket10〜20帯
- Diamond300〜500帯
- Raid Shared HP
- Raid encounter stat ±15%
- PvP Rating gain/loss
- Matchmaking range
- Guild XP ±20%
- Energy Drink supply
- VIT recovery
- paid skip price/count
- Gacha rarity rate within approved range

ただし変更後Simulation必須。

---

# 6. LEGACY CLEANUP

Production pathから除去:

- Character role gameplay
- Character passive master
- HP_TANK old pattern
- old rarity multipliers
- Skill alignment gameplay
- Skill AP
- AP manipulation
- Timeline manipulation
- Evasion
- Generic Reflect
- Cooldown reset/reduction
- old DEF constant
- old Crit
- Normal Attack100
- additive same-stat stacking
- random equipment options
- equipment plus_val×0.10
- old Character/Equipment stat scale
- old Raid HP100k scale
- Guild 25-member cap
- Guild combat buff10%
- PvP/Raid/Mission User EXP
- Diamond-heavy reward tables
- Normal Ticket-heavy Login
- Residue/Scrap proposal

---

# 7. DB Migration Impact

P0 migration対象:

Character:
- master schema
- xp
- awakening multiplier
- skill slots

Skill:
- multi-effect schema
- available_from_round
- awakening point

Equipment:
- new master values
- xp
- LB point/progress
- remove random option dependency

Battle:
- balance config
- snapshot
- replay event compatibility

Quest:
- reward pools
- first clear
- skip counters

Resource:
- shared vitality
- pvp_point
- raid_point
- recovery timestamps

Gacha:
- pools
- pity
- free daily pulls
- Special locked/unlock state

Ranking:
- period
- snapshot
- reward distribution

Guild:
- level/xp/activity
- member cap
- buff

---

# 8. UI Migration Impact

P0:
- Character Growth
- Skill Growth
- Equipment Growth
- Gacha Result duplicate feedback
- Special locked UI
- Quest reward/result
- VIT/PvP/Raid resource distinction
- PvP mock/result
- Raid list/result/ranking
- Ranking00:00
- Guild level/member cap
- old AP/Role/Random Option text removal
- Total Power recalculation display

M9 PresentationはBattle authorityを変更しない。

---

# 9. 運営Impact

必要なLive Ops可変値:
- Quest reward
- Manual/LB/Ticket supply
- Raid shared HP
- PvP matchmaking/rating
- Guild XP
- Gacha pickup/weight
- Energy Drink/skip limits

Dashboard:
Source別SupplyとProgression分布を観測。

---

# 10. 課金Impact

P0/P1で必ず整合:
- Diamond scarcity
- Special Ticket free experience
- CASH sale
- Quest skip
- Energy Drink
- future Raid/PvP recovery
- Starter/VIP

Combat progressionを無制限購入で即日完成させない。

---

# 11. M9合流Gate

以下を満たせばGameplay Foundation設計チャットを閉じてよい。

### Design Gate
- [x] Character structure
- [x] Skill structure
- [x] Equipment structure
- [x] Battle contract
- [x] Quest
- [x] Resource
- [x] PvP
- [x] Raid
- [x] Ranking
- [x] Gacha
- [x] Reward Supply
- [x] Guild
- [ ] Total Power formula
- [ ] Tutorial Initial Grant bundle
- [ ] Canonical Item IDs
- [ ] Character60 individual final table
- [ ] Skill70 final machine table

### Implementation Gate
M9側/Codexで実施:
- DB migration
- machine master
- Battle engine
- RPC
- seed
- client type/UI
- simulation
- E2E
- human acceptance

---

# 12. 最終判定

**Gameplay Foundation設計は約90〜95%完了。**

このチャットを今すぐ完全Closeするにはまだ早い。

残る設計P0は主に5点:
1. **Total Power Formula**
2. **Tutorial Initial Grant Master**
3. **Canonical Item Master / 正式名称**
4. **Character60個別Master完成**
5. **Skill70個別Machine Master完成**

この5点を閉じれば、
設計側は **GAME03 Production Gameplay Foundation Freeze** としてClose可能。

Shopはプレオープン時の課金/表示方針によってP0/P1。
GvG詳細Reward/Balanceは、プレオープン中ClosedならP1だが、本リリース前必須。

その後M9本流へ:
**Production Gameplay Foundation Migration**
として一括Handoffする。
