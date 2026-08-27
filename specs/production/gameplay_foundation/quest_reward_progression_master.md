# TRIBE NEON — クエスト報酬 / User EXP / 時短 Production Master
バージョン: 2026-08-21
ステータス: PRODUCTION FREEZE CANDIDATE / P0

## 1. 今回FIXする上位仕様
- **User EXPの供給源はQuestのみ。**
- PvP / Raid / Guild / Mission / Login / RankingからUser EXPは配布しない。
- Character / Equipment EXPはQuestを最大供給源とする。
- Guild設立解放はUser Lv5。
- 初日45〜60分程度でLv8へ到達可能。
- Quest時短にはDaily Capを持たせる。
- 課金でAwakening/LBを先行できても、EXP側にDaily Soft Gateを残す。
- ただし重課金者が低Levelで数週間止まるほどEXPを絞らない。
- 1円 = 1 Diamond = 10 CASH。

## 2. User Level Lv1→8
| Current → Next | Required EXP |
|---|---:|
| 1→2 | 100 |
| 2→3 | 150 |
| 3→4 | 200 |
| 4→5 | 250 |
| 5→6 | 300 |
| 6→7 | 350 |
| 7→8 | 400 |

累計1,750 User EXP。全てQuestから獲得する。

## 3. Quest Base Reward
| Difficulty | Duration | Vitality | User EXP | CASH |
|---|---:|---:|---:|---:|
| EASY | 60 sec | 5 | 100 | 300 |
| NORMAL | 180 sec | 10 | 180 | 700 |
| HARD | 300 sec | 15 | 300 | 1,300 |

User EXP効率だけでDifficultyが固定されないよう、主な差は育成素材に置く。

## 4. First Clear
| Difficulty | Base EXP | First Bonus | First Total |
|---|---:|---:|---:|
| EASY | 100 | +100 | 200 |
| NORMAL | 180 | +120 | 300 |
| HARD | 300 | +200 | 500 |

初期Quest sequenceは5〜8 Clear程度でLv8到達するよう構成する。
例: EASY初回×3=600、NORMAL初回×2=600、HARD初回×1=500、EASY repeat×1=100 → 1,800。

Tutorial時点でHARDが不自然なら個別First Clear値で1,750前後へ調整する。

## 5. Character EXP
Character EXP item:
- S=100
- M=500
- L=2,000

Guaranteed:
| Difficulty | Reward |
|---|---|
| EASY | CHAR_EXP_S×5 |
| NORMAL | CHAR_EXP_M×2 |
| HARD | CHAR_EXP_L×1 |

Additional:
- EASY 30% → S×3
- NORMAL 40% → M×1
- HARD 50% → L×1

期待値:
- EASY ≈590
- NORMAL ≈1,200
- HARD ≈3,000 Character EXP

## 6. Equipment EXP
Equipment EXP:
- S=100
- M=500
- L=2,500

Guaranteed:
| Difficulty | Reward |
|---|---|
| EASY | EQUIP_EXP_S×6 |
| NORMAL | EQUIP_EXP_M×3 |
| HARD | EQUIP_EXP_L×1 |

Additional:
- EASY 30% → S×4
- NORMAL 40% → M×2
- HARD 50% → L×1

期待値:
- EASY ≈720
- NORMAL ≈1,900
- HARD ≈3,750 Equipment EXP

Character/Equipment EXPは同時に獲得し、どちらか一方の抽選にはしない。

## 7. Rare Drop
Skill Manual:
- EASY 0%
- NORMAL 1%
- HARD 3%

Equipment LB Point Material:
- EASY 0%
- NORMAL 2%
- HARD 5%

**覚醒の書は通常Quest Dropなし。**

## 8. First Clear Material
EASY:
- CHAR_EXP_M×1
- EQUIP_EXP_M×1

NORMAL:
- CHAR_EXP_L×1
- EQUIP_EXP_L×1

HARD:
- CHAR_EXP_L×2
- EQUIP_EXP_L×2
- Equipment LB Point×1

## 9. Daily Quest Volume
Active F2P目安: **12〜18 Quest/day**。
Heavy active / paid acceleration: **20〜30/day**。

無制限instant completionは禁止。

## 10. 時短
無料時短:
- **5回/日**
- 00:00 JST reset
- Tutorial専用無料時短はDaily枠と分離可能

課金時短:
- **10回/日**
- **30 Diamond / 回**
- 最大300 Diamond=300円相当/日

通常日instant completion cap:
- Free 5
- Paid 10
- Total 15/day

時短は待ち時間のみ0にし、Reward倍率は変えない。
時短でも通常Vitalityを消費する。

## 11. Daily EXP Simulation
EASY5 / NORMAL5 / HARD5 = 15 Quest/dayの場合:

Character EXP:
5×590 + 5×1,200 + 5×3,000
= **23,950/day**
≈718,500/month。

Equipment EXP:
5×720 + 5×1,900 + 5×3,750
= **31,850/day**
≈955,500/month。

First Clear / Login / Mission / Raid / Ranking/Eventを加え、
Active F2Pの初期Targetを:
- Character EXP **90万〜130万/月**
- Equipment EXP **120万〜170万/月**
へ修正する。

## 12. Heavy PayerのEXP Gate
課金者はGacha DuplicateでAwakening/LBを先行でき、Paid SkipでEXP取得を加速できる。
ただしPaid Skip 10/day + Vitality制約により、初日全完成はできない。

重点Character目標感:
- D1 Lv50〜60
- D3 Lv60〜70
- D7 Lv70〜80
- D14 Lv80〜90
- D21〜30 Lv100到達可能

**+5になったCharacterがLv50で数週間停止する状態は禁止。**
一方、+5取得即Lv100も通常状態にはしない。

## 13. F2P
F2PはEXPよりAwakening Level Capへ先に到達しやすい。

+0 Lv50 cap
→ QuestでEXP素材を貯蓄
→ Duplicate/覚醒の書で+1
→ 貯蓄EXPでLv60

というCap解放後の成長体験を許容する。
EXP素材所持上限は設けない、または非常に高くする。

## 14. CASH
Quest CASH:
- EASY 300
- NORMAL 700
- HARD 1,300

15 Quest例で11,500 CASH/day。
CASHは課金販売対象なのでQuestだけで過剰供給しない。

## 15. User EXP Long-term
User EXPはQuestのみ。
以前提案したFirst PvP/Raid/Mission等のUser EXPは削除する。

Lv8以降CurveはQuest volume 12〜18/dayで再Simulationする。

## 16. Canonical Master
```text
quest_master
- quest_id
- town_id
- difficulty
- duration_sec
- vitality_cost
- user_exp
- cash_reward
- first_clear_user_exp
- reward_pool_id
- first_clear_reward_pool_id

quest_reward_pool_master
quest_reward_pool_items
- reward_pool_id
- item_id
- quantity
- probability
- guaranteed
```

User EXP/CASHは明示column、Item DropはPool化する。

## 17. Server Authority
1. Quest start
2. Vitality consume
3. completion time / skip entitlement
4. authoritative Battle
5. server-side reward roll
6. first-clear check
7. User EXP
8. CASH
9. Items
10. Mission progress
11. authoritative Result

時短entitlement消費もatomic。
ClientはDrop/User EXPを確定しない。

## 18. UI
Quest Card:
- Duration
- Vitality
- User EXP
- CASH
- 主なDrop
- First Clear
- Difficulty

Running:
- Remaining time
- Free Skip remaining
- Paid Skip remaining
- Paid Skip 30 Diamond

Result:
- User EXP / User Level
- Character EXP
- Equipment EXP
- Rare Drop
- CASH
- Next CTA

## 19. 運営
TUNABLE:
- EXP数量
- Rare Drop率
- CASH
- Paid Skip価格
- Free/Paid Skip回数
- Vitality recovery

Frozen:
- User EXP only from Quest
- Character/Equipment EXP Quest-primary
- 両EXP Guaranteed
- Awakening Book通常Dropなし
- Instant completion Daily Cap
- SkipはRewardを増減しない

監視:
- Quest/day
- Difficulty mix
- Skip usage
- Paid Skip conversion
- EXP/day
- Character Level distribution
- Equipment Level distribution
- Awakening vs Character Level gap

## 20. 課金影響
Quest SkipはAcceleration商品。
30 Diamond/回×10/dayで最大300円/日。

課金Awakening先行 + EXP Daily Soft Gateにより毎日プレイする理由を残す。
ただし課金価値を否定するほどEXP Gateを強くしない。

## 21. 他Masterへの修正
- User Level Master: PvP/Raid/Activation User EXP削除
- Login/Mission Master: Mission User EXP削除
- Raid Master: First Raid User EXP削除
- PvP Master: First PvP/Match User EXP削除
- Quest: User EXP唯一のSourceへ
- Character/Equipment EXP monthly target増量

## 22. Acceptance
1. User EXP source=Quest only
2. PvP/Raid/Mission/Login/RankingでUser EXP増加なし
3. Lv8まで5〜8 Quest程度
4. Guild Create Lv5
5. Character EXP毎Quest Guaranteed
6. Equipment EXP毎Quest Guaranteed
7. HARDの素材価値が高い
8. Skill Manual rare drop
9. Equipment LB rare drop
10. Awakening Book通常Dropなし
11. Free Skip 5/day
12. Paid Skip 10/day
13. Paid Skip 30 Diamond
14. Skip reward=normal
15. Skip cap atomic
16. Vitality消費
17. First Clear once
18. server-side drop
19. F2P monthly EXP simulation
20. Heavy payer level-gap simulation

## 23. 確定状況
今回FIX:
- User EXP=Questのみ
- Character/Equipment EXP=Quest主供給
- 両EXPをQuestでGuaranteed
- Awakening Book通常Quest Dropなし
- 時短Daily Cap
- 課金Awakening先行 + EXP Soft Gate

Production提案:
- Quest User EXP 100/180/300
- First Clear total 200/300/500
- Character EXP expected 590/1,200/3,000
- Equipment EXP expected 720/1,900/3,750
- Free Skip 5/day
- Paid Skip 10/day
- 30 Diamond/skip
- Active F2P Character EXP 90〜130万/月
- Equipment EXP 120〜170万/月

数値はSimulationで±20%調整可能。構造はProduction Freeze対象。
