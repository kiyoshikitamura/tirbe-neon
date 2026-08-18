# Open Beta 暫定スキルバトルマスタ レビュー

最終更新: 2026-08-12

## 目的

Open Betaで装着スキルをQUESTバトルへ反映するため、現行70スキルを差し替え可能なDBマスタへ移す前のレビュー案である。本書と生成JSON/SQLはレビュー資料であり、承認前にDBへ適用しない。

## 差し替え可能な構造

バトルロジックは`skill_battle_master`の以下の列だけを読み、個別IDをハードコードしない。

| 列 | 用途 |
| --- | --- |
| `skill_id` | 現行所持データと結合する不変キー |
| `display_name` | 再生ログ表示名 |
| `enabled` | ガチャ・装着・バトルでの使用可否 |
| `kind` | `ATTACK / HEAL / BUFF / DEBUFF` |
| `target` | 敵/味方の単体・全体 |
| `power_percent` | 攻撃はATK倍率、回復は最大HP倍率 |
| `cooldown` / `initial_cooldown` | 行動単位の再使用間隔・初期待機 |
| `status` / `status_chance` | 毒・暗闇・沈黙・スタン |
| `modifier_*` | ATK/DEF/SPD補正、効果量、持続 |
| `source_revision` | 暫定/正式データの識別 |

正式値への移行は同一`skill_id`のUPSERTで行う。ユーザー所持行、装着行、限界突破値は移行不要とする。

## 自動変換ルール案

- CD: N=2、R=3、SR=4、SSR=5。
- `ATTACK`: 現行`power`をATK倍率として使用。
- `HEAL`: 現行`power`を基礎に、確定仕様の上限で単体30%・全体18%へ正規化。
- `DEFENSE`: DEF上昇へ変換し、15〜25%・2行動に制限。
- `SUPPORT`: 説明からATKまたはSPD上昇へ変換し、15〜25%・2行動に制限。
- `JAMMER`: 明示された毒・暗闇・沈黙・スタンのみ状態異常化し、それ以外はATK/DEF低下へ変換。
- 全体対象は名称・説明で明示されたものだけに限定。
- 限界突破倍率は既存確定曲線（+10で+41%）を`power_percent`へ実行時乗算する。CDは短縮しない。

## 旧説明からの主な置換

| 旧表現 | 暫定置換 | 理由 |
| --- | --- | --- |
| 戦闘内AP回復 | SPDまたはATK上昇 | 共有APを使用しない確定仕様 |
| 出血 | 通常攻撃、または毒 | 出血は初期実装外 |
| 反射 | DEF上昇 | 反復型反射は初期実装外 |
| 継続回復 | 即時回復 | 継続回復は現エンジン未対応 |
| 全体スタン/沈黙 | 全体暗闇または単体状態異常 | 全体スタン/沈黙は禁止 |
| 防御無視/確定破壊 | 通常の高倍率攻撃 | 防御式と上限目安を維持 |

## 重要な保留

`SKILL_051〜070`は現データ自体が「専用スキル枠」「後日確定」で、`exclusive_character_id`も全件nullである。この20件は推測でキャラクターへ割り当てず、暫定案では`enabled=false`とする。Open Betaで専用20件を有効にするには、最低限以下の確定が必要である。

- 対象キャラクターID
- 正式名称と説明
- 種別、対象、倍率、CD
- 状態異常または補正内容

## レビュー対象ファイル

- 全70件の可読データ: `specs/open_beta_provisional_skill_battle_master.json`
- DB投入形式のレビュー草案: `supabase/manual/review_open_beta_provisional_skill_battle_master.sql`
- 再生成スクリプト: `scripts/generate_provisional_skill_battle_master.mjs`

## 承認後の実装範囲

1. `skill_battle_master`テーブルと50件の有効マスタをmigration化する。
2. QUESTスナップショットで、装着済み・解放枠内・専用条件適合・`enabled=true`のスキルを結合する。
3. `effectScale`を倍率・補正値・状態異常成功率へ適用する。
4. Edge Functionとローカル決定論エンジンのBUFF/DEBUFF処理を一致させる。
5. 通常攻撃フォールバック、再生ログ、勝敗・報酬を実DB E2Eで確認する。
