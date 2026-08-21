# TRIBE NEON — Canonical Item Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

## 1. 目的

Gameplay Foundationで使用する消費Item / Ticket / 育成素材のID・正式名称・用途を一元化する。

旧IDや仮称が複数箇所に存在するため、Productionでは本MasterをCanonical Sourceとする。

原則:
- 同一用途のItemを複数IDで持たない
- UI表示名とDB用途を一致させる
- 新しい交換通貨を増やさない
- Residue / Scrap等は作らない
- Item画像Assetも本Master IDに紐付ける

---

# 2. Character EXP

| Canonical ID | 正式名称 | EXP | 用途 |
|---|---|---:|---|
| CHAR_EXP_S | 強化ドリンク・小 | 100 | Character EXP |
| CHAR_EXP_M | 強化ドリンク・中 | 500 | Character EXP |
| CHAR_EXP_L | 強化ドリンク・大 | 2,000 | Character EXP |

旧 `ITEM_EXP_DRINK` のような単一Itemは廃止。

Tutorial / Quest / Login / Mission / Raidで共通利用。

---

# 3. Equipment EXP

| Canonical ID | 正式名称 | EXP | 用途 |
|---|---|---:|---|
| EQUIP_EXP_S | カスタムオイル・小 | 100 | Equipment EXP |
| EQUIP_EXP_M | カスタムオイル・中 | 500 | Equipment EXP |
| EQUIP_EXP_L | カスタムオイル・大 | 2,500 | Equipment EXP |

既存名称思想を維持。

---

# 4. Character Awakening

| Canonical ID | 正式名称 | 用途 |
|---|---|---|
| AWAKENING_BOOK | 覚醒の書 | Character Awakening |

仕様:
- 同一Character Duplicateと併用
- 通常Quest Dropなし
- Login / Achievement / Event等で少量供給
- 固定Supplyは約0.75〜1.0冊/月程度を上限目安

旧仮ID `LAW_OF_STRIFE` 等はProductionから廃止。

---

# 5. Skill Awakening

| Canonical ID | 正式名称 | Point | 用途 |
|---|---|---:|---|
| SKILL_MANUAL | スキル指南書 | 1 | 任意Skill Awakening |

仕様:
- Normal / Exclusive共通
- 同一Skill Duplicateとは別
- Skill +10必要30pt
- Active F2P供給目安18〜25/月

旧:
- SKILL_LB_BOOK
- Exclusive専用別素材

は廃止。

---

# 6. Equipment Limit Break

## Generic Material

| Canonical ID | 正式名称 | LB Point | 用途 |
|---|---|---:|---|
| EQUIP_LB_PART | 改造パーツ | 1 | 任意Equipment LB |

正式名称候補として **「改造パーツ」** をProduction提案する。

理由:
- 「限界突破ハンマー」より世界観に合う
- Weapon / Clothes / Accessoryすべてへ使える
- UI上短い
- Generic素材だと直感的

同一Equipment Duplicate:
- N = 1pt
- R = 2pt
- SR = 3pt
- SSR = 4pt

Generic `改造パーツ` は1個=1pt。

旧 `EQUIP_LB_HAMMER` は廃止。

---

# 7. Quest / GvG Vitality

| Canonical ID | 正式名称 | 効果 |
|---|---|---|
| ENERGY_DRINK | エナジードリンク | Vitality +50 |

対象:
- Quest
- GvG

仕様:
- Quest/GvG Shared Vitality
- Natural Max超過回復可
- Hard Storage Cap候補500
- 00:00で残量消失なし

旧 `ITEM_STAMINA_01` は廃止。

---

# 8. PvP Recovery

| Canonical ID | 正式名称 | 効果 |
|---|---|---|
| PVP_POINT_RECOVERY | バトルパス | PvP Point回復 |

**正式名称は仮FIX候補。**

注意:
「バトルパス」は一般的にSeason Passを意味するため、
既存UI/Assetに強い依存がなければ別名称を推奨。

第一候補:
**ファイトチケット**

Canonical候補:
`PVP_POINT_TICKET`

正式名称:
`ファイトチケット`

効果量はPvP Master/Shopで確定。

Production推奨は `PVP_POINT_TICKET / ファイトチケット`。

---

# 9. Raid Recovery

| Canonical ID | 正式名称 | 効果 |
|---|---|---|
| RAID_POINT_TICKET | レイドチケット | Raid Point回復 |

First Raidは無料なのでTutorial Initial Grantには不要。

通常Supply/Shop/Eventで利用可能。

---

# 10. Gacha Tickets

## Normal

| Canonical ID | 正式名称 | 用途 |
|---|---|---|
| NORMAL_GACHA_TICKET_CHARACTER | キャラクターガチャチケット | Character Normal 1回 |
| NORMAL_GACHA_TICKET_SKILL | スキルガチャチケット | Skill Normal 1回 |
| NORMAL_GACHA_TICKET_EQUIPMENT | 装備ガチャチケット | Equipment Normal 1回 |

ただし恒久Daily Free10があるため、
通常運営Rewardでは大量配布しない。

Campaign / Compensation用途中心。

## Special

カテゴリ別にする。

| Canonical ID | 正式名称 | 用途 |
|---|---|---|
| SPECIAL_TICKET_CHARACTER | SPキャラクターチケット | Character Special 1回 |
| SPECIAL_TICKET_SKILL | SPスキルチケット | Skill Special 1回 |
| SPECIAL_TICKET_EQUIPMENT | SP装備チケット | Equipment Special 1回 |

理由:
Character用TicketでSkill Specialを引ける等の曖昧さを避ける。

Special Ticket:
- 1枚=1pull
- Diamond変換不可
- 他カテゴリへ転用不可
- Special pityへcount
- プレオープン前/中から保有可能

UI表示では「SPECIAL」より短い `SP` 表記を使用可。

---

# 11. Currency

CurrencyはInventory Itemとは分離する。

| ID | 名称 | 種別 |
|---|---|---|
| CASH | CASH | Soft Currency |
| DIAMOND | ダイヤ | Premium Currency |

Economy基準:
- 1円 = 1 Diamond
- 1 Diamond = 10 CASH

Item MasterへQuantity Assetとして入れず、
Currency Walletとして扱う。

---

# 12. Optional / Campaign Items

以下は初期Gameplay Foundationに必須ではない。

- Character Selection Ticket
- SSR Selection Ticket
- Event Exchange Currency
- Cosmetic Ticket
- Guild Currency

必要になるまで追加しない。

特に200 Special Sparkの「SSR選択」は、
Inventory Ticketを必須にせず、
Gacha pity reward UIから選択grantする実装でもよい。

---

# 13. 売却

Equipment:
不要InstanceをCASH売却可能。

Skill:
+10済みDuplicateはCASH自動変換。

Character:
+5済みDuplicateの扱いはCharacter Awakening Masterを正とし、
CASHだけに落とすか覚醒の書相当へ接続するかは別途最終確認。

売却価値はEconomy Masterで定義し、
Item Masterへ直接固定しない。

---

# 14. Legacy ID Migration

Production pathから削除/alias禁止対象:

- ITEM_EXP_DRINK
- ITEM_STAMINA_01
- SKILL_LB_BOOK
- EQUIP_LB_HAMMER
- EXCLUSIVE_CONTRACT
- LAW_OF_STRIFE
- old generic NORMAL_GACHA_TICKET
- old generic PvP Pass naming

Migration方針:
- 既存Production User item数量がある場合はCanonical IDへ1:1 conversion
- Preview/devはseed再生成可
- UI/TextはCanonical名称へ統一

---

# 15. Canonical Machine Schema

```text
item_master
- item_id
- category
- display_name
- description
- icon_asset_path
- stackable
- max_stack
- effect_type
- effect_value
- rarity_visual
- sellable
- enabled
```

Category:
- CHARACTER_EXP
- EQUIPMENT_EXP
- CHARACTER_AWAKENING
- SKILL_AWAKENING
- EQUIPMENT_LIMIT_BREAK
- RESOURCE_RECOVERY
- GACHA_TICKET

Currencyは別Master/Wallet。

---

# 16. Asset Path

Production推奨:
```text
/public/items/{item_id}.png
```

例:
- `/items/char_exp_s.png`
- `/items/skill_manual.png`
- `/items/equip_lb_part.png`
- `/items/special_ticket_character.png`

File nameはlower snake_case。

同じ画像を複数Canonical IDで使う場合でも、
色/カテゴリ差が必要なTicketは別Assetを推奨。

---

# 17. UI

アイテム詳細:
- Icon
- 正式名称
- 1行用途
- 所持数
- 使用先CTA

例:
`スキル指南書`
`任意のスキル覚醒に使用できます。`

Item IDやpoint conversion詳細は通常UIで露出しすぎない。

Equipment:
`改造パーツ`
`装備の限界突破に使用できます。`

---

# 18. DB影響

P0:
- Canonical item master作成/更新
- user_items foreign key/index確認
- legacy item migration
- Reward Masterのitem_id差替え
- Login/Mission/Quest/Raid/Ranking/Gacha Ticket参照更新

Shopはプレオープン中非アクティブなので、
Shop Product Masterへの接続はP1で可。

---

# 19. 画像Asset Gap Audit対象

本Master確定後に以下をRepository Assetと照合する。

必須候補:
1. 強化ドリンク・小
2. 強化ドリンク・中
3. 強化ドリンク・大
4. カスタムオイル・小
5. カスタムオイル・中
6. カスタムオイル・大
7. 覚醒の書
8. スキル指南書
9. 改造パーツ
10. エナジードリンク
11. ファイトチケット
12. レイドチケット
13. キャラクターNormal Ticket
14. スキルNormal Ticket
15. 装備Normal Ticket
16. SPキャラクターチケット
17. SPスキルチケット
18. SP装備チケット

最大18種。

ただし既存Asset再利用可能なものは生成しない。

---

# 20. Acceptance

1. Item用途1ID
2. Character EXP3種
3. Equipment EXP3種
4. Awakening Book1種
5. Skill Manual1種
6. Equipment Generic LB1種
7. Energy Drink1種
8. PvP/Raid recovery分離
9. Special Ticketカテゴリ分離
10. CurrencyはItemと分離
11. Residue/Scrapなし
12. Legacy IDをProduction codeから除去
13. Reward Master全参照Canonical
14. icon asset path一意
15. Missing asset list生成可能
16. Shop disabledでもItem Master成立
17. Special Ticket pre-open inventory可能
18. Skill Manual Exclusive共通
19. Equipment duplicateとはGeneric LBを区別
20. UI名称統一

---

# 21. 確定状況

## 既に確定方向
- 覚醒の書
- スキル指南書
- Character/Equipment EXP三段階
- Energy Drink
- Special Ticket
- PvP/Raid resource分離
- Residue/Scrapなし

## 今回Production名称候補
- EQUIP_LB_PART = **改造パーツ**
- PVP_POINT_TICKET = **ファイトチケット**
- RAID_POINT_TICKET = **レイドチケット**
- Special Ticketは3カテゴリ別

この3名称について異論がなければFIXし、
次工程でRepositoryのItem画像Assetを全件照合して不足分を生成する。
