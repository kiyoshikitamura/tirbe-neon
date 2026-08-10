# TRIBE NEON 既存仕様クリーンアップ指示書

作成日: 2026-08-10
対象: `kiyoshikitamura/tribe-neon`
実施者想定: Codex
基準仕様: `specs/art_bible.md` v1.1、および既存の各正本仕様

実施状況: 2026-08-10クリーンアップ実施済み。結果と意図的な保留事項は`art_bible_cleanup_report.md`を参照する。

## 1. 目的

Art Bible v1.1確定に伴い、既存仕様書内に残る旧タイトル、旧拠点、旧アート方針、責務重複を整理する。

本作業は原則として仕様書のクリーンアップであり、ゲームロジック、DBスキーマ、UI実装を無断で変更しない。

## 2. 確定事項

### 正式タイトル

`TRIBE NEON`

以下は旧称として扱う。

- `TRIBE: NEON REIGN`
- `TRIBE NEON REIGN`
- その他 `NEON REIGN` を正式タイトルとして扱う記述

### 確定7拠点

- 新宿
- 渋谷
- 池袋
- 六本木
- 秋葉原
- 川崎
- 横浜

`ネオンタワー`、`ディープドック` 等の旧架空拠点、および「4つの主要拠点」という記述は旧仕様残骸として扱う。

### アート正本

`specs/art_bible.md`

ただし責務は以下の通り分離する。

- ゲームルール・DB・画面固有機能: `game_spec.md` / 各 `spec_*.md`
- 共通UI実装値: `ui_design_system.md`
- マイページ固有情報・導線: `mypage_design_policy.md`
- キャラクター個別設定: `assets_characters.md`
- Art Direction / 制作判断 / Asset QA: `art_bible.md`

## 3. 最優先クリーンアップ

### 3.1 タイトル表記統一

`specs/**/*.md` を検索し、正式タイトルとして使用されている以下を `TRIBE NEON` へ統一する。

- `TRIBE: NEON REIGN`
- `TRIBE NEON REIGN`

注意:
歴史的経緯、旧名称説明、変更履歴として明示的に引用している箇所は機械置換しない。

### 3.2 拠点仕様統一

`game_spec.md` および関連 `spec_*.md` から以下を検索する。

- `BASES`
- `bases`
- `base_id`
- `locations`
- `ネオンタワー`
- `ディープドック`
- `4つの主要拠点`
- 拠点一覧
- 拠点移動
- raid / raid_bosses
- guild_base_controls

文章上の拠点名称・拠点数は確定7拠点へ統一する。

ただしDB上の `bases` というテーブル名は、単なる内部テーブル名であり、変更の必要性を別途判断する。Art Bible確定を理由にテーブル名を `locations` 等へ変更しない。

`base_id`、`guild_base_controls`、`raid_bosses.base_id` 等も同様に、既存実装との互換性を確認せず変更しない。

### 3.3 Art Bible参照追加

アート制作に関係する仕様書の冒頭または責務説明へ、必要に応じて以下の趣旨を追加する。

> 作品全体のアートディレクション、追加アセット制作、AI生成、広告クリエイティブ、Asset QAは `art_bible.md` を正本とする。

対象候補:

- `visual_concept.md`
- `visual_prompt_sheet.md`
- `assets_characters.md`
- `ui_design_system.md`
- `mypage_design_policy.md`
- 装備関連仕様
- スキル関連仕様
- ガチャ関連仕様
- GvG関連仕様

すべてのファイルへ機械的に追加せず、アート責務を持つ文書だけを対象にする。

## 4. visual_concept.md 整理

`visual_concept.md` と `art_bible.md` の重複を確認する。

Art Bibleへ移管済みの主な内容:

- 世界観
- キャラクター共通画風
- 背景共通画風
- 装備・アイテムArt Direction
- スキルArt Direction
- バトル演出素材
- 制作・書き出し
- Asset QA

推奨処理:

1. `visual_concept.md` を削除しない。
2. 当面は「旧来の詳細資料 / Art Bibleへ統合済み」として残す。
3. 冒頭へ `art_bible.md` 優先を明記する。
4. Art Bibleと矛盾する箇所のみ修正する。
5. 重複削除は別PRでもよい。

## 5. visual_prompt_sheet.md 整理

既存60キャラクターの個別生成プロンプトは維持する。

共通画風についてArt Bibleと重複する場合:

- 個別キャラクター固有条件 → `visual_prompt_sheet.md`
- 全作品共通Art Direction → `art_bible.md`

とする。

以下は維持:

- 全身立ち絵
- 頭頂から靴先
- 2Dセミリアル
- グリーンバック
- 個別キャラクタープロンプト

Art Bibleと矛盾する古い共通条件があればArt Bibleへ合わせる。

## 6. assets_characters.md 整理

キャラクター個別設定の正本として維持する。

特に以下をArt Bibleの一般論で変更しない。

- レイジ
- ルイ
- 張
- ミオ
- ケンゴ
- リン
- テツ
- セリカ
- ユウジ
- ゴウ

顔、髪、衣装、傷、タトゥー、アクセサリー、ポーズは個別仕様優先。

冒頭へ以下の責務分離を追記する。

- 個別キャラクター設定: 本書
- 共通画風・制作・QA: `art_bible.md`

## 7. UI仕様との整合

`ui_design_system.md` の責務は維持する。

Art BibleからUIへ移管しないもの:

- HEX値
- Typography
- タップ領域
- Button
- Card
- Modal
- Safe Area
- Loading
- Responsive layout
- UI state

Art Bibleの色・光の記述はアート上の思想であり、CSSトークンを上書きしない。

## 8. マイページ背景

`mypage_design_policy.md` と `game_spec.md` の背景記述を確認する。

確定事項:

- 背景はプレイヤーの個人拠点ビジュアルとして使用
- 本番背景格納先: `public/bg/`
- 7拠点を使用
- リーダーキャラクターを背景上へ配置
- 背景変更時のUI/導線は既存仕様を維持

旧4拠点前提の文章があれば7拠点へ修正する。

## 9. Asset Path確認

以下を正規パスとして仕様書内で統一する。

- 背景: `public/bg/`
- 本番キャラクター: `public/characters/`
- キャラクター原画: `public/raw_assets/`
- スキル: `public/skills/`
- 装備: `public/equipments/`

コード側で異なる実パスを使用している場合は、仕様書だけ先行変更せず差分として報告する。

## 10. 画像フォーマットQA

`public/bg/bg_street_*.png` は、GitHub取得時のバイナリ先頭からJPEGデータである可能性が確認されている。

Codexでローカル実ファイルを検査する。

例:

```bash
file public/bg/bg_street_*.png
```

またはNode/Python等でmagic bytesを確認する。

JPEG実体の場合、以下を判断する。

A. PNGへ再エンコードして既存パスを維持
B. `.jpg` へリネームして参照コードを変更

当初推奨はAだったが、実測で新宿背景が980,243 bytesから2,079,987 bytesへ増加したため採用しない。表示性能を優先し、Bをコード参照、seed、`quest_towns.bg_image`と同時に行う後続タスクとする。既存参照を残したままファイルだけをリネームしない。

## 11. DB影響監査

今回のクリーンアップだけを理由にDB migrationを作成しない。

特に以下は名称が旧仕様風でも、実装済みなら維持可能。

- `bases`
- `base_id`
- `guild_base_controls`
- `raid_bosses.base_id`

確認すべきなのは「7拠点を保持できるか」であり、「テーブル名がbaseかlocationか」ではない。

7拠点マスタがDBまたはseedに存在しない場合のみ、既存マスタ投入方式に従って追加案を作成する。

## 12. 課金影響

Art Bibleおよび今回のクリーンアップによる課金ロジック変更なし。

変更禁止:

- ガチャ確率
- 価格
- VIP
- スターターパック
- 通貨
- 天井
- 重複救済

画像・演出のみArt Bibleへ従う。

## 13. 運営影響

今後追加する以下の制作物はArt Bibleを受入基準とする。

- 新キャラクター
- 新背景
- イベント背景
- 装備
- スキル
- ガチャバナー
- X広告
- 短尺広告
- GvG演出
- 報酬演出

## 14. Codex実行手順

1. 作業前にブランチを作成する。
2. `specs/**/*.md` を対象に旧タイトルを検索する。
3. 旧拠点名・4拠点記述を検索する。
4. 各ヒットを「文章のみ」「DB/コード影響あり」に分類する。
5. 文章のみの安全な修正を行う。
6. DB/コード影響のある箇所は勝手にrenameせず一覧化する。
7. Art Bibleへの参照を必要な仕様書へ追加する。
8. Asset Path記述を整理する。
9. 背景画像の実フォーマットを検査する。
10. テスト・lint・buildを実行する。
11. 変更ファイル一覧と未解決事項を報告する。

## 15. 検索コマンド例

PowerShell:

```powershell
Get-ChildItem specs -Recurse -Filter *.md |
  Select-String -Pattern 'TRIBE: NEON REIGN|TRIBE NEON REIGN|ネオンタワー|ディープドック|4つの主要拠点'
```

Git:

```bash
git grep -n -E "TRIBE: NEON REIGN|TRIBE NEON REIGN|ネオンタワー|ディープドック|4つの主要拠点"
```

拠点関連:

```bash
git grep -n -E "BASES|bases|base_id|guild_base_controls|raid_bosses"
```

## 16. 完了条件

以下を満たした時点でクリーンアップ完了とする。

- 正式タイトル表記が `TRIBE NEON` に統一されている
- 現行仕様の拠点数・名称が7拠点に統一されている
- Art Bibleと既存アート仕様の優先順位が明確
- キャラクター個別設定が破壊されていない
- UI正本の責務が維持されている
- 不要なDB migrationが発生していない
- 課金ロジックが変更されていない
- Asset Pathが仕様と実装で整合している
- 背景画像フォーマット問題が確認・処理されている
- build / lint / testで新規エラーがない

## 17. Codexへの最終指示

この作業は「旧仕様の残骸除去」と「仕様書間の責務整理」が目的である。

既存実装を仕様書の名称へ合わせるための大規模renameは行わない。

特にDBテーブル、FK、API、型、ルーティングのrenameが必要に見える場合は実装せず、影響範囲と推奨対応を報告する。

安全なドキュメント修正と、既存仕様上明確な7拠点マスタ整合のみを実施し、それ以外はレビュー対象として残す。
