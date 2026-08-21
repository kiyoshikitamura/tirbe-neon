# TRIBE NEON — Production Gameplay Foundation

最終更新: 2026-08-21  
対象: GAME03 / TRIBE NEON  
用途: Production Freeze / Codex Implementation / DB Migration / QA

## 1. このDirectoryの位置付け

`specs/production/gameplay_foundation/` は、Gameplay Foundationについて本プロジェクトで確定・監査したProduction仕様を集約する。

既存仕様と本Directoryが衝突する場合:
1. 本Directory内で `FIX / Frozen / 上位確定` と明示された仕様
2. 既存Production仕様
3. Legacy implementation / old seed / old migration
の順で扱う。

Creativeの正本（顔・衣装・Asset表現等）は既存Art Bible / Character Creative仕様を維持する。
Creative文書中の旧Rarity表記をGameplay Production Rarityの根拠にしてはならない。

## 2. 重要な確定仕様

- Production SSR10: アゲハ / ゴウ / カエデ / カレン / ケンゴ / コハル / レオ / ミオ / ミヤビ / レイジ
- Normal Gacha: Character / Skill / Equipment各10連を毎日恒久無料
- Tutorial Character Gacha: 10連中1枠をSSR10体から等確率確定。別SSR Grantなし。当日Character無料10連を消費
- Special Gacha: プレオープン中からUI表示、Drawは本リリースで解放
- Shop: プレオープン中Footer表示のみ、非アクティブ・遷移不可
- User EXP: Questのみ
- Quest/GvG: Vitality共有
- PvP/Raid: 個別行動力
- Guild: Lv1〜5 / Member 10→12→14→17→20 / Combat Bonus最大2%
- Daily/Weekly/Ranking Reset: JST 00:00
- Total Power: Main Formation 5人合計。Guild Buffは除外
- Residue / Scrap / 10:1交換案は撤回

## 3. ファイル一覧

### Production Master
- `quest_reward_progression_master.md`
- `action_resource_vitality_master.md`
- `gacha_production_master.md`
- `duplicate_supply_simplified_master.md`
- `reward_supply_master.md`
- `guild_level_activity_master.md`
- `total_power_master.md`
- `tutorial_initial_grant_master.md`
- `canonical_item_master.md`

### Audit / Simulation
- `gacha_duplicate_awakening_simulation.md`
- `gameplay_foundation_final_gap_audit.md`
- `item_asset_gap_audit.md`

Audit/Simulation文書は設計根拠であり、最新Production Masterと衝突した場合はProduction Masterを優先する。

## 4. Canonical実装フロー

Reviewed Production MD
→ Canonical Machine Master
→ Supabase DB seed/import
→ generated TypeScript/client data
→ Simulation
→ E2E
→ Human Acceptance

同じMaster値をMD / TS / SQLへ手書きで多重管理しない。

## 5. FIXとTUNABLE

### 構造Freeze
- User EXP source
- Gachaカテゴリ分離
- Daily Free10恒久
- Tutorial10連SSR確定枠
- Quest/GvG VIT共有
- PvP/Raid resource分離
- Duplicate簡略化
- Guild Member Cap
- Total Power構造
- Canonical Item用途

### P0-TUNABLE
Open Beta / Simulationで概ね±20%調整可能:
- Quest Reward量
- Skill Manual供給
- Generic Equipment LB供給
- Special Ticket供給
- Diamond供給
- Guild XP
- Raid HP
- PvP Rating / Match range
- Vitality recovery
- Skip価格/回数
- Gacha rateの承認範囲内調整

構造変更やSupply ±20%以上は全体Simulationを再実施する。

## 6. Legacy Cleanup

Production pathから除去対象:
- old Character role gameplay
- HP_TANK等old growth
- Skill AP / timeline manipulation
- Evasion / generic Reflect
- old DEF constant / old Crit / Normal Attack100%
- random Equipment options
- old Equipment `plus_val × 0.10`
- Guild 25-member cap / +10% combat buff
- PvP/Raid/Mission User EXP
- Diamond-heavy old reward
- `ITEM_EXP_DRINK`
- `ITEM_STAMINA_01`
- `SKILL_LB_BOOK`
- `EQUIP_LB_HAMMER`
- `LAW_OF_STRIFE`
- Residue / Scrap proposal

## 7. 現在残るGameplay Foundation P0

1. Character60個別Canonical Machine Master
2. Skill70個別Canonical Machine Master
3. Character/Skill/Equipment参照整合監査
4. Canonical Item IDのRepository反映
5. Battle Engine Migration
6. Progression RPC / Quest Reward / Resource Migration
7. Customer Journey E2E

Shop Master本体はプレオープン中非アクティブのため本リリース前P1。
GvG詳細Balance/Rewardもプレオープン中Closedなら本リリース前P1。

## 8. Asset

Canonical Item画像は別チャットで制作。
配置予定:
`public/items/{canonical_item_id}.png`

Gameplay実装はCanonical Item ID確定を正として進め、画像制作完了を設計Blockerにしない。

## 9. Codexへの注意

- 仕様にない値を推測しない。
- Legacy値をProduction仕様へ逆流させない。
- Creative SSRラベルをProduction Rarityとして使わない。
- Client側でBattle / Drop / Gacha / Rewardを確定しない。
- Machine Master生成後はそれをDB/Client双方の入力SOTとする。
