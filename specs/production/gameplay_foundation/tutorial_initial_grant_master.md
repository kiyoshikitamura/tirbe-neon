# TRIBE NEON — Tutorial Initial Grant Production Master
バージョン: 2026-08-21
ステータス: **PRODUCTION FREEZE CANDIDATE / P0**

## 1. 上位確定仕様
- Tutorial Character Gachaは既存UXどおり**10連**。
- 10枠中**1枠はProduction SSR10体から等確率10%でSSR確定**。
- 残り9枠はNormal Character Gacha通常Poolから抽選。
- Tutorial 10連は**当日のCharacter Normal無料10連 entitlementを消費**する。
- Tutorial SSRを別途1体Grantしない。したがってTutorial Character取得は10pullのまま。
- Tutorial SSR確定枠はSpecial pity / Special Ticket / Special Gachaに影響しない。
- Server RNG / 1 user 1回 / reroll機能なし。
- 初期Skillは現行Tutorialで使用している**「ストリートパンチ」**を維持し、実装時に現行Skill IDとCanonical Skill Masterを突合する。
- User EXPはQuestのみ。
- Quest/GvGはVitality共有、PvP/Raidは専用Point。
- Shopはプレオープン中Footer表示のみ、非アクティブ・遷移不可。
- Special Gachaはプレオープン中から表示し、Drawは本リリース解放。

## 2. Production SSR10
Tutorial確定枠対象:
- アゲハ
- ゴウ
- カエデ
- カレン
- ケンゴ
- コハル
- レオ
- ミオ
- ミヤビ
- レイジ

各10%。Creative仕様書の旧SSR見出しはProduction Rarity根拠にしない。

## 3. Initial Resource候補
- Character EXP: 1,500
- Equipment EXP: 2,500
- CASH: 20,000
- Vitality: 100
- Tutorial専用Quest Skip: 3
- PvP Point: 5
- Raid Point: 5
- Diamond: 0

数値はP0-TUNABLE。

Tutorial専用Questは原則VIT 0。
First Mock PvP / First Raidもcost 0。

## 4. Equipment
初期SSR Equipmentは配布しない。
TutorialでEquipment具体IDの事前配布が必須でない場合は、Equipment Daily Free10から取得させる。

## 5. Special Ticket
Initial Grantへ固定で含めない。
Pre-open campaign / Login / Mission等の別Reward Ledgerで付与し、二重配布を防止する。

## 6. Atomicity
Tutorial entitlementと初期Resource GrantはServer authoritative / idempotent。
Refresh・再送・通信断で二重取得不可。

## 7. Acceptance
1. Tutorial Character Gacha = 10pull
2. SSR確定枠 = 1/10
3. SSR対象 = Production SSR10のみ
4. SSR10 equal 10%
5. 残9枠 = Normal Character Pool
6. Tutorial SSR別Grantなし
7. 当日Character Daily Free10を消費
8. Skill/Equipment Daily Free10は別途利用可能
9. Special pity非加算
10. Server RNG
11. rerollなし
12. ストリートパンチ維持
13. Initial Grant idempotent
14. User EXP Grantなし
15. Shop pre-open inactive
