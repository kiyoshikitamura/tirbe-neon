# TRIBE NEON — Duplicate簡略化 / 育成Supply最終調整 Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

## 1. 目的

恒久の毎日無料10連を維持しつつ、育成EconomyとUIを複雑化しない。

撤回する旧提案:
- Skill Residue
- Equipment Scrap
- 10:1交換
- N/R大量Duplicateを汎用育成Pointへ変換する仕組み

Productionでは、Duplicateは原則として**対象固有育成**へ接続する。

---

# 2. Character Duplicate

同一Character Duplicate:
- 当該CharacterのAwakening進行へ使用
- +5到達後のDuplicateのみ汎用価値へ変換

Character側の汎用救済は既存の「覚醒の書」Economyへ接続する。

新しい中間通貨は作らない。

UI:
- `重複`
- `覚醒進行に加算`
- `現在 +2 → +3まであと○`

---

# 3. Skill Duplicate

同一Skill Duplicate:
- N: 当該Skill +1pt
- R: +2pt
- SR: +3pt
- SSR: +4pt

Skill +10必要:
**30pt**

Skill Manual:
- 任意Skillへ+1pt
- Normal / Exclusive共通

重要:
- 他SkillへのDuplicate Point移動不可
- N/R DuplicateをSSR Skill育成へ転用不可
- +10済みSkill Duplicateは**CASHへ自動変換**
- 新しいResidue/交換所なし

CASH変換額はRarityごとにItem/Economy Masterで定義し、
育成の主要Supplyには数えない。

UI:
`重複 → このSkill +3pt`
だけで完結。

---

# 4. Equipment Duplicate

Duplicate Equipmentは**別Instanceとして取得**。

ユーザーの選択肢:
1. そのまま装備
2. 別Characterへ装備
3. 同一EquipmentのLimit Break素材として使用
4. 不要ならCASH売却

禁止:
- 別EquipmentのLBへ直接使用
- N/R EquipmentをSSR Equipmentの汎用LB Pointへ変換
- Scrap化
- Exchange Currency化

同一Equipment DuplicateをLBへ使う場合:
- N = 1pt
- R = 2pt
- SR = 3pt
- SSR = 4pt

Generic Equipment LB素材だけは、Quest/Raid/Mission/Ranking/Login/Shop等から供給する。

---

# 5. UI複雑度

ユーザーが理解すべき育成アイテム:

### Character
- Character EXP
- 同一Character Duplicate
- 覚醒の書

### Skill
- 同一Skill Duplicate
- スキル指南書

### Equipment
- Equipment EXP
- 同一Equipment Duplicate
- 汎用Equipment LB素材

これ以上の中間素材/交換通貨はProduction初期に追加しない。

---

# 6. Skill Supply再計算

Normal Skill無料10連:
- 300pull/月
- N55 / R30 / SR13 / SSR2

1Skillあたり期待Duplicate進行:
- N: 約16.5pt/月
- R: 約18pt/月
- SR: 約7.8pt/月
- SSR: 約1.6pt/月

したがって:
- N/Rは自然に早く完成
- SRは中期
- SSRはManual/Specialで補助

このRarity差を維持する。

---

# 7. Skill Manual Supply Target

旧案45〜60/月は撤回。

Production候補:
**Active F2P 18〜25冊/月**
中心値: **20冊/月**

推奨Source:
- Login: 4〜5
- Daily/Weekly Mission: 5〜6
- Raid: 3〜4
- Ranking: 3〜4
- Quest rare drop: 1〜2
- Event: extra

Manualを1Skillへ集中した場合:
SSR SkillはNormal Duplicate込みで約2〜3ヶ月で+10可能。

Party全体では6〜8ヶ月で:
- Core 5〜10 Skill +10
- Main 10〜15 Skill +6〜8
- Utility +3〜6

を狙う。

---

# 8. Equipment Generic LB Supply Target

同一Equipment Duplicateは対象固有なので、
Generic LB素材の役割は「狙ったEquipmentを進める救済」。

Production候補:
**Active F2P 25〜40pt/月**
中心値: **30pt/月**

推奨Source:
- Login: 4〜5
- Mission: 6〜8
- Raid: 5〜7
- Ranking: 4〜6
- Quest rare drop: 2〜4
- Event: extra

1Equipment +10 = 25pt。

35Slot全て+10は完成条件ではない。

---

# 9. Character / Equipment EXP Supply

Quest Masterでの増量方針を維持。

Active F2P:
- Character EXP: **90万〜130万/月**
- Equipment EXP: **120万〜170万/月**

EXPは日々の成長体感を作るため多めに配布する。

長期Gate:
- Character = Awakening
- Equipment = Limit Break
- Skill = Duplicate / Manual

---

# 10. 覚醒の書

恒久Character無料10連を考慮し、
固定Free供給は強くしすぎない。

Production候補:
- 固定平均: **0.5〜0.75冊/月**
- Achievement/Event込み: **0.75〜1.0冊/月程度**

D90推しSSR+3の下振れ救済に使用しつつ、
+5を8〜10ヶ月程度の長期目標として残す。

---

# 11. Special Ticket / Diamond

方針維持:

Special Ticket:
**10〜20枚/月**
中心15枚。

Diamond:
**300〜500/月**
中心400。

Diamond直接配布よりSpecial Ticketを優先する。

理由:
- Special体験を保証
- Diamond購入需要を維持
- Quest Skip / Energy Drink / Shopへ転用不可

---

# 12. Reward Supply階層

Free Supplyの強さ:

1. Character / Equipment EXP — 多い
2. CASH — 多い
3. Normal無料Pull — 非常に多い
4. Equipment Generic LB — 中
5. Skill Manual — 中
6. Special Ticket — 少〜中
7. Diamond — 少
8. 覚醒の書 — 非常に少

全Mission/Login/Ranking/Raid/Quest Rewardはこの階層へ統一する。

---

# 13. DB影響

追加不要:
- Skill Residue table
- Equipment Scrap table
- Duplicate exchange wallet

必要:
- Skillごとのawakening_point
- Equipment instance inventory
- Equipment LB progress
- Generic LB material item
- Skill +10後DuplicateのCASH変換rule
- Equipment売却CASH rule

既存DBからのMigrationを軽く保つ。

---

# 14. UI影響

### Gacha Result — Skill
`重複`
`覚醒 +3pt`
`18 / 30`

### Gacha Result — Equipment
`DUPLICATE`
`新しい装備として獲得`

Equipment Detail:
`同じ装備を素材にして限界突破`

### +10済Skill
`重複 → CASHへ変換`

交換所/Residue/Scrap画面は不要。

---

# 15. 運営影響

運営が調整するのは:
- Skill Manual供給数
- Generic Equipment LB素材供給数
- EXP Drop
- Special Ticket
- Diamond
- 覚醒の書

Duplicate変換率そのものを頻繁に変更しない。

ユーザーの理解を優先する。

---

# 16. 課金影響

無料Normalを恒久化しても、
N/R大量DuplicateをSSR育成へ横流しできないため、
Special / Manual / LB商品価値を維持できる。

課金者:
- Target Character/Skill/EquipmentをSpecial/Pickupで狙う
- Manual/LB素材で集中育成
- Quest Skip / Energy DrinkでEXP取得を加速

F2P:
- Normalで広く育つ
- Manual/Generic LBを推しへ集中

---

# 17. Acceptance

1. Skill Duplicateは同一Skillへだけ加算
2. Skill Manualのみ汎用
3. +10 Skill duplicateはCASH
4. Residueなし
5. Equipment duplicateは別Instance
6. 同一EquipmentだけLB直接素材
7. 別Equipmentへの転用不可
8. Scrapなし
9. Generic Equipment LBはコンテンツ供給
10. Skill Manual 18〜25/月
11. Generic LB 25〜40pt/月
12. Character EXP 90〜130万/月
13. Equipment EXP 120〜170万/月
14. Diamond 300〜500/月
15. Special Ticket 10〜20/月
16. 覚醒の書0.75〜1.0/月程度
17. UIに新規交換通貨なし
18. DBに新規Residue/Scrap walletなし
19. 6〜8ヶ月Party完成Simulation
20. 恒久毎日無料30連と両立

---

# 18. 確定状況

## 今回FIX
- Residue / Scrap案撤回
- Duplicateは対象固有育成
- Skill +10後はCASH
- Equipment不要品はCASH売却
- 汎用素材はコンテンツ報酬から供給
- UI/DBの中間通貨追加なし

## Supply Freeze候補
- Skill Manual 18〜25/月
- Generic Equipment LB 25〜40pt/月
- Character EXP 90〜130万/月
- Equipment EXP 120〜170万/月
- Special Ticket 10〜20/月
- Diamond 300〜500/月
- 覚醒の書0.75〜1.0/月程度

次工程では、このSupply帯へ
Login / Mission / Ranking / Raid / Questの個別報酬表を再配分し、
Reward Master最終版を作成する。
