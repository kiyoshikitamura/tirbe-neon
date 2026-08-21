# TRIBE NEON — 行動力 / Vitality / PvP Point / Raid Point Production Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

## 1. 確定する上位思想

GAME03では行動原資を意図的に分離する。

### Shared Vitality
**QuestとGvGで共有する。**

目的:
- GvG中にEnergy Drinkを過剰使用した場合でも超過回復分を無駄にしない
- GvG終了後に残ったVitalityをQuestへ回せる
- GvG参加 → Quest育成 → 次回GvGという循環を作る

### Dedicated Resources
- PvP = `pvp_point`
- Raid = `raid_point`

PvP/RaidはQuest/GvG Vitalityを消費しない。

したがって「Raid/PvPを遊んだためQuest育成が止まる」構造にはしない。

# 2. Vitality基本仕様

対象:
- Quest
- GvG

初期提案:
- Natural Max: **100**
- Natural Recovery: **1 VIT / 6分**
- 24時間自然回復: 240 VIT
- Energy Drink: **+50 VIT**

自然回復は`current_vit < natural_max`の間のみ。

# 3. Overcap

Energy Drink / Reward / Operation grantはNatural Maxを超えて回復可能。

**提案: Hard Storage Cap = 500 VIT**

例:
- Current 80
- Energy Drink +50
- → 130 VIT

130はそのまま保持。
100を超えている間は自然回復timerが進まない。

GvG終了時に残った130をQuestへ全量使用可能。

これがQuest/GvG共有の主要目的。

# 4. GvGとの接続

GvGの詳細消費量は既存GvG Masterを正とし、ここでは共有Walletだけを定義する。

必須:
- QuestとGvGが同じ`vitality` column / walletを使用
- GvG用に別VITを複製しない
- Energy Drinkも同じWalletへ回復
- GvG中のDrink使用でNatural Max超過可
- GvG終了後も超過分を保持
- 期限切れ/23:30で超過VITを削除しない

23:30 GvG第3戦終了後:
- 残VITでQuest可能
- 00:00 Ranking/Daily resetまで継続プレイ可能
- 00:00でもVIT自体はリセットしない

# 5. Quest消費

既Quest Master:
- EASY 5
- NORMAL 10
- HARD 15 VIT

自然回復240/dayなら理論上:
- EASY 48回
- NORMAL 24回
- HARD 16回

ただし実際には:
- Quest duration
- instant completion cap
- GvG消費
- Player session length

が制約になる。

したがってVITだけでQuestを12〜18/dayへ強制する必要はない。

# 6. Quest時短との関係

Quest instant completion:
- Free 5/day
- Paid 10/day
- Total15/day

VITは通常どおり消費。

時短上限到達後も通常待ち時間でQuest継続可能。

したがって「Paid Skip cap」は課金即時進行のcapであり、
通常プレイ自体のDaily hard capではない。

これは意図した仕様。

# 7. Energy Drink

Production proposal:
- 1本 = +50 VIT
- Overcap可
- Hard Storage Cap 500

使用時:
`new_vit = min(current_vit + 50, 500)`

500を超える場合:
- 使用不可
- Item非消費

部分消費/切り捨ては禁止。

例:
Current 480ではDrink使用不可。
Current 450なら500へ。

# 8. Energy Drink供給

Energy DrinkはQuest/GvG共通価値を持つため、
単なるQuest Stamina Itemより価値が高い。

Free supply initial target:
- Login: 4/month前後
- Daily/Weekly Mission: 4〜8/month
- Event/Compensation: variable
- GvG関連報酬: optional

Active F2P:
**8〜15本/月**を初期目標。

= 400〜750 extra VIT/month。

大量配布しすぎるとGvG消費判断が消えるため注意。

# 9. Energy Drink販売

CASH/Diamondとの課金設計はShop Masterで最終FIX。

初期候補:
- 1本 50 Diamond
- 1日購入上限 5本

= 最大250円/day相当。

ただしGvG競争性へ直結するため、
販売上限は必須。

Unlimited purchaseは禁止。

# 10. GvGでのOveruse UX

GvG中:
- Current VIT
- 次Action必要VIT
- Drink所持
- 使用後VIT

を明示。

「残ったVITはQuestでも使用できます」と説明可能。

これにより、
GvG終了直前にDrinkを使って余った分が損になる不安を減らす。

# 11. PvP Point

Quest/GvG VITと完全分離。

Production candidate:
- Max 5
- 1戦1
- Natural Recovery 1 / 2時間
- First Mock PvP = 0
- Point回復ItemはPvP専用

PvP Pointが0でもQuest/GvG/Raidには影響しない。

# 12. Raid Point

Quest/GvG VIT・PvP Pointと完全分離。

Production candidate:
- Max 5
- 1 Attempt 1
- Natural Recovery 1 / 2時間
- First-ever Raid = 0
- Raid専用回復Item

Raid Pointが0でもQuest/GvG/PvPには影響しない。

# 13. Dedicated Resourceを分ける理由

もし全機能がVIT共有なら、
初期Customer Journeyで:

Quest
→ First PvP
→ First Raid

を遊ぶほどQuest育成が遅れる。

これは避ける。

一方GvGだけQuestと共有することで:
- GvGにリソースを寄せる戦略性
- Drink購入/使用価値
- GvG後の余剰をQuestへ戻す
- 次GvGのためQuestで育成

という循環が成立する。

# 14. Daily Reset

JST00:00:
- Free Quest Skip count reset
- Paid Quest Skip purchase/use count reset
- Shop daily purchase limit reset
- Daily Mission reset
- Ranking period切替

リセットしない:
- Current Vitality
- Overcap Vitality
- PvP Point current amount
- Raid Point current amount

各Pointはtime-based recovery。

# 15. DB / Runtime

`users`またはresource wallet:
```text
vitality
vitality_recovered_at

pvp_point
pvp_point_recovered_at

raid_point
raid_point_recovered_at
```

Master:
```text
resource_master
- resource_type
- natural_max
- hard_cap
- recovery_amount
- recovery_interval_sec

resource_item_master
- item_id
- target_resource
- restore_amount
- overcap_allowed
```

Daily counters:
```text
quest_free_skip_used
quest_paid_skip_used
energy_drink_shop_purchase_count
counter_date_jst
```

# 16. Atomicity

Resource consume:
1. lazy recovery計算
2. row lock
3. available check
4. consume
5. recovered_at補正
6. action transaction

Drink:
1. ownership/item lock
2. current resource recovery
3. hard-cap check
4. item consume
5. VIT add
6. commit

同時Requestで二重消費/二重回復不可。

# 17. UI

Home:
- VIT
- PvP Point
- Raid Point
を用途別に表示。

Quest/GvG:
同じVIT icon/nameを使用。

PvP:
専用Point。

Raid:
専用Point。

異なるresourceを同じ「スタミナ」表現で混同しない。

# 18. 運営監視

Track:
- VIT generated/day
- VIT spent Quest/GvG split
- GvG Drink use
- GvG end時平均overcap
- overcap→Quest消費量
- Drink free/paid source
- Quest paid skip
- PvP point utilization
- Raid point utilization

特に見るKPI:
**GvGでDrink使用 → 終了後Questへ戻る率**

これが共有VIT設計の狙い。

# 19. 課金影響

Energy Drinkは:
- GvG action acceleration/resource
- Quest progression resource

の二重価値を持つ。

そのため購入価値は高い。

反面、無制限販売すると:
- GvG Pay-to-Win
- Quest EXP無制限進行

の両方を起こすため、
**購入上限必須**。

Quest Paid Skipにも上限があるため、
Drinkだけ大量購入しても即時無限育成にはならない。

# 20. Acceptance

1. Quest/GvG same VIT wallet
2. PvP separate
3. Raid separate
4. Drink +50
5. VIT overcap
6. hard cap500
7. overcap中natural recovery停止
8. GvG終了でVIT消失なし
9. 00:00でVIT消失なし
10. overcap VITをQuest消費可能
11. Quest skip still consumes VIT
12. PvP/Raid do not consume VIT
13. First Mock PvP free
14. First Raid free
15. resource recovery atomic
16. Drink hard-cap overflow時非消費
17. Daily skip reset00:00
18. shop purchase reset00:00
19. Replay/Battle resultとresource transaction整合
20. GvG→Quest overcap E2E

# 21. 確定状況

## 今回FIX
- Quest/GvG Vitality共有
- GvG Energy Drink超過回復をQuestへ持ち越せる
- PvP/Raidは個別行動力
- 00:00でresource残量を消さない
- Quest時短でもVIT消費

## Production提案
- Natural Max100
- Recovery 1/6min
- Hard Cap500
- Energy Drink +50
- F2P Drink 8〜15/月
- Shop 50 Diamond / max5/day
- PvP Point 5 / 2h
- Raid Point 5 / 2h

数値はGvG消費量・既存Resource実装監査後に最終FIX。
構造はProduction Freeze対象。
