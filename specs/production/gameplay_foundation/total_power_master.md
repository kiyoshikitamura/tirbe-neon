# TRIBE NEON — 総合力（Total Power）Production Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

## 1. 目的

総合力は以下の共通指標として使用する。

- Home / Formation上の「強くなった」進捗表示
- 個人総合力Ranking
- Guild総合力Ranking
- PvP Matchmakingの補助Signal
- Guild Recommendation / Profileの参考値
- Battle前の戦力比較

重要:
**総合力はBattle結果を決定しない。**
BattleはAuthoritative Battle Engineで実計算する。

総合力は「Battle強度と高い相関を持つ表示・検索用の近似値」。

---

# 2. 計算単位

## Character Power
1 Character + 装備中Skill + 装備中Equipmentから算出。

## Formation Power
Main Formationの最大5 Character Power合計。

これをPlayer UI上の**総合力**とする。

## Guild Total Power
Guild MemberそれぞれのMain Formation Powerの合計。

未編成Memberは0ではなく、
有効Formationを持つMemberのみ集計対象。

---

# 3. Guild Buffの扱い

**Guild Combat Buffは個人総合力へ含めない。**

理由:
- Guild加入/脱退だけで個人総合力Rankingが変動するのを防ぐ
- Guild LevelがGuild Total Powerへ自己増幅する循環を防ぐ
- 個人の育成成果を純粋に比較できる
- PvP Matchmaking値を安定させる

BattleではGuild BuffをPreBattleへ適用するが、
Total Power計算では除外する。

UI上必要なら:
`総合力 512,340`
`Guild Bonus +2%`
を別表示可能。

---

# 4. Character Power構造

```text
Character Power
= Stat Power
+ Skill Power
+ Equipment Effect Power
```

EquipmentのFlat Stat / %StatはFinal PreBattle Statへ既に含まれるため、
別途Equipment rarity pointを加算して二重評価しない。

Character AwakeningもStatへ反映済みなので、
「Awakening +3だから固定○Power」を追加しない。

---

# 5. Stat Power

使用する値:
**Guild BuffとBattle一時Buffを除外したPreBattle Final Stat**

含む:
- Character Level
- Character Awakening
- Equipment Level
- Equipment LB
- Equipment Flat Stat
- Equipment % Stat Passive

除外:
- Guild Buff
- Battle Start Buff
- Skill Buff
- Status
- Temporary Signature trigger

Production初期式:

```text
Stat Power =
  HP / 25
  + ATK × 0.70
  + DEF × 1.00
  + SPD × 60
  + LUK × 120
```

最終値は四捨五入して整数。

---

# 6. Weightの考え方

ATK:
Battleの与Damageへ最も直接影響するため高Weight。

DEF:
K=45,000のDefense式で耐久へ継続的に寄与。

HP:
絶対値が20〜30万級なので係数を圧縮。

SPD:
行動順のみへ影響し、Action回数を増やさないため中程度。

LUK:
Criticalのみへ影響し、Status成功率へ使わないため小さめ。

このWeightはRarityを直接参照しない。
N/R/SR/SSRは実Stat差・Skill差・Equipment差の結果としてPower差が出る。

---

# 7. Reference

完成BALANCED SSRのReference例:
- HP 260,000
- ATK 50,000
- DEF 25,000

仮にSPD120 / LUK20なら:

- HP = 10,400
- ATK = 35,000
- DEF = 25,000
- SPD = 7,200
- LUK = 2,400

Stat Power:
**80,000**

ここにSkill / Equipment Effectが加わり、
完成SSR Characterは概ね**9万〜11万Power**へ入る設計を狙う。

5人完成Party:
概ね**45万〜55万Power**が初期Reference。

これは表示Scaleとして分かりやすく、
1万単位の成長も視認しやすい。

---

# 8. Skill Power

Skillは「装備中のSkillだけ」を評価。

所持しているだけの未装備SkillはFormation Powerへ入れない。

Base:

| Rarity | Base Power |
|---|---:|
| N | 700 |
| R | 1,000 |
| SR | 1,500 |
| SSR | 2,200 |

Exclusive:
- SR Exclusive: +300
- SSR Exclusive: +500

Awakening:

```text
Skill Power
= Base Skill Power
× (1 + 0.03 × Skill Awakening)
+ Exclusive Bonus
```

例:
SSR +10:
2,200 × 1.30 = 2,860

SSR Exclusive +10:
2,860 + 500 = 3,360

6Slot全SSR +10なら:
概ね17,000〜20,000Power。

Skill Effectそのものの290%等を直接Powerへ変換しない。
Effect調整時にTotal Powerが不安定になるため。

---

# 9. Equipment Effect Power

Equipment Flat / %StatはStat Powerへ反映済み。

ここで評価するのは、
Statへ直接変換できないPassive / Signatureのみ。

| Effect Tier | Power |
|---|---:|
| None | 0 |
| SR Passive | 300 |
| SSR Generic Passive | 500 |
| SSR Exclusive / Signature | 800 |

Equipment LB +3/+5/+10で解放される固定Optionが
Statへ直接反映される場合はStat側へ含める。

非Stat Optionの場合:
- +3 unlock: +100
- +5 unlock: +150
- +10 unlock: +250

1EquipmentにつきEffect Power上限:
**1,300**

7Slot最大:
約9,100。

---

# 10. Character Powerの概算Range

完成時の目安:

| Rarity | Character Power Reference |
|---|---:|
| N | 45,000〜60,000 |
| R | 55,000〜70,000 |
| SR | 65,000〜85,000 |
| SSR | 90,000〜110,000 |

これは固定Rarity補正ではない。

実際の:
- Stat
- Skill
- Equipment
- Awakening
- Level

の合計結果としてこの帯へ入ることをAcceptanceで確認する。

完成SRが育成途中SSRを上回る余地は維持する。

---

# 11. Formation Power

```text
Formation Power
= Σ Character Power
```

最大5人。

同一Character/Equipment Instanceの不正重複があるFormationは
Power計算前にinvalid。

Support/Friend Characterは:
- PvE一時Supportとして使用する場合、Player恒常総合力へ含めない。

---

# 12. Individual Power Ranking

個人総合力Ranking:
**Main Formation Power**を使用。

全Rosterの合計にはしない。

理由:
- 実戦Partyの強さと一致
- unused N/R大量保有でRankingが上がらない
- Character追加で古参だけ有利になるインフレを防ぐ
- PvP/GvGへ直結する

Main Formation変更時にRanking値を更新。

---

# 13. Guild Total Power Ranking

```text
Guild Total Power
= Σ Eligible Member Main Formation Power
```

Eligible:
- Guild所属
- 有効5人Formationを保存済み
- Ban/Delete対象でない

Guild Level Combat Bonusは含めない。

Guild Member Cap増加による総Power増加は許容する。
これは「大きく育ったGuild」の価値そのもの。

Tie-breakは既Ranking Masterを正とする。

---

# 14. PvP Matchmaking

PvPはRatingをPrimary、
Formation PowerをSecondary Signalとして使用。

Power Ratio:
```text
opponent_power / player_power
```

既PvP Masterの80〜130%帯へ使用。

Guild Buffを除外したPowerで比較するため、
Guild差だけでCandidate帯が歪まない。

Actual Battleでは両者のGuild Buff等をSnapshotへ反映。

---

# 15. Power再計算Trigger

Server-side recalc:

Character:
- Level Up
- Awakening
- Formation change

Skill:
- Equip/Unequip
- Awakening

Equipment:
- Equip/Unequip
- Level
- LB
- fixed option unlock

Master update:
- Character/Skill/Equipment balance change

Guild join/leave:
**個人Total Power再計算不要**
（Guild Buffを含まないため）

---

# 16. Cache / DB

推奨:

```text
user_characters.power
formations.total_power
users.main_formation_power

guilds.total_power
```

PowerはServer calculated cache。

Canonical値は各Master/User state。
Power cacheをGameplay authorityにしない。

更新Transaction後に同期再計算、
またはOutbox/Jobで確実に追随。

PvP candidate取得時に古いPowerを長時間使わない。

---

# 17. Power Version

Balance Formula変更に備えて:

```text
power_formula_version = 1
```

を持つ。

Master Migration時:
- 全Character
- 全Main Formation
- 全Guild

を再計算。

Ranking Period途中でFormula Versionを変更しない。

変更は原則次Period開始時。

---

# 18. UI

主要表示:
- Home
- Formation
- Character Detail
- PvP Candidate
- Ranking
- Guild Detail

Growth Result:
`総合力 482,300 → 489,120`
`+6,820`

を強く表示。

本作の「毎日強くなった」体感を作る主要Feedback。

Character Detail:
Character Powerを表示可能。

Power breakdown詳細は初期Productionでは不要。
複雑化を避ける。

---

# 19. Guild UI

Guild:
- Guild Total Power
- Member Power
- Power Ranking

Guild Buff:
総合力とは別表示。

例:
`ギルド総合力 6,280,000`
`ギルド効果 HP+2% / ATK+2% / DEF+2%`

これを混同しない。

---

# 20. 運営

監視:
- Rarity別Power分布
- User Level別Main Formation Power
- Awakening別Power
- PvP win rate by Power ratio
- Raid contribution by Power
- GvG outcome by Guild Power ratio
- Power inflation/month

Power Formulaは頻繁に変更しない。

Balance調整は実Battle値を正とし、
Powerは後追いで相関を合わせる。

---

# 21. 課金影響

総合力は課金Progressを明確に可視化する。

ただし:
- VIPによるPower直接加算
- 課金額によるPower補正
- Guild役職Power補正

は禁止。

課金でCharacter/Skill/Equipmentを育成した結果としてPowerが上がる。

Ranking Rewardは既Supply MasterのSnowball制御を維持。

---

# 22. Acceptance

1. Power server-authoritative
2. Guild Buff excluded
3. Battle temporary buff excluded
4. Equipment flat double-countなし
5. Character Awakening double-countなし
6. Skill equipped only
7. unequipped Skill excluded
8. Equipment passive counted once
9. Main Formation 5人合計
10. roster totalではない
11. Guild=sum member formation
12. guild buff recursive inflationなし
13. completed SSR 90k〜110k帯
14. completed SR 65k〜85k帯
15. completed SR can exceed incomplete SSR
16. Party completed reference45万〜55万
17. growth actionでPower増分表示
18. PvP power ratio correlation
19. Ranking deterministic
20. formula version migration可能

---

# 23. 確定状況

## 今回Freeze候補
- 総合力 = Main Formationの5Character合計
- Guild Buffを総合力から除外
- Character Power = Stat + equipped Skill + non-stat Equipment Effect
- Individual Ranking = Main Formation Power
- Guild Ranking = Member Main Formation合計
- PvPはRating Primary / Power Secondary
- Server authoritative
- Formula version管理

## TUNABLE
- HP/ATK/DEF/SPD/LUK係数
- Skill Base Power
- Equipment Effect Power

初期係数はBattle Simulationで相関を確認し、
必要なら±10〜15%まで調整可能。

構造自体はProduction Freeze対象。
