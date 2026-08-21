# TRIBE NEON — Item Image Asset Gap Audit
バージョン: 2026-08-21
ステータス: P0 ASSET AUDIT

## Repository監査結果

`public/` recursive treeおよび主要Asset directoryを確認。

確認できた主要Directory:
- `public/characters`
- `public/skills`
- `public/equipments`
- `public/gacha`
- `public/menu`
- `public/ui`
- `public/battle`
- `public/avatars`
- `public/world`

Canonical Item用の `public/items/` directoryは現時点で確認できない。

Repository tree上でもCanonical Item名/IDに対応する専用画像Assetを確認できなかったため、
Production用Item Iconは新規制作対象とする。

## 新規制作対象

### Character EXP
1. `CHAR_EXP_S` — 強化ドリンク・小
2. `CHAR_EXP_M` — 強化ドリンク・中
3. `CHAR_EXP_L` — 強化ドリンク・大

### Equipment EXP
4. `EQUIP_EXP_S` — カスタムオイル・小
5. `EQUIP_EXP_M` — カスタムオイル・中
6. `EQUIP_EXP_L` — カスタムオイル・大

### Growth
7. `AWAKENING_BOOK` — 覚醒の書
8. `SKILL_MANUAL` — スキル指南書
9. `EQUIP_LB_PART` — 改造パーツ

### Resource
10. `ENERGY_DRINK` — エナジードリンク
11. `PVP_POINT_TICKET` — ファイトチケット
12. `RAID_POINT_TICKET` — レイドチケット

### Normal Gacha Ticket
13. `NORMAL_GACHA_TICKET_CHARACTER` — キャラクターガチャチケット
14. `NORMAL_GACHA_TICKET_SKILL` — スキルガチャチケット
15. `NORMAL_GACHA_TICKET_EQUIPMENT` — 装備ガチャチケット

### Special Gacha Ticket
16. `SPECIAL_TICKET_CHARACTER` — SPキャラクターチケット
17. `SPECIAL_TICKET_SKILL` — SPスキルチケット
18. `SPECIAL_TICKET_EQUIPMENT` — SP装備チケット

## Art Direction

既存TRIBE NEON Art Bibleへ合わせる。

共通:
- 1:1 game item icon
- transparent background
- central object
- mobile 48〜96px表示でも識別可能
- 細かい文章をIcon内へ入れない
- Neon / street / nightlife tone
- photorealではなくgame UI向けsemi-realistic illustration
- category silhouetteを明確に分ける

S/M/L:
同一Object silhouetteを維持し、容量・発光量・装飾密度で差を出す。
色だけに依存しない。

Ticket:
Character / Skill / Equipmentを形状/central emblemでも区別。
Normal / SPはFrame/foil densityでも明確に区別。

## Production file

推奨:
`public/items/{lower_snake_case_id}.png`

例:
`public/items/skill_manual.png`

Resolution:
- master 512×512 PNG
- transparent
- runtimeで縮小

## 判定

**18/18 新規制作対象。**

既存AssetをCanonical Item Iconとして流用する前提は置かない。
