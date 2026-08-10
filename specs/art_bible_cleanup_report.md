# Art Bible既存仕様クリーンアップ報告

実施日: 2026-08-10
基準: `art_bible.md` v1.1 / `art_bible_cleanup_codex.md`

## 1. 実施範囲

- 正式タイトルを`TRIBE NEON`へ統一
- Art Bible自身の版・章番号・継続監査表記を整合
- アート責務を持つ仕様書へ`art_bible.md`の優先関係を追加
- 世界・移動・クエストの7拠点と、現行GvG／レイド対象5拠点を分離
- 旧4拠点仕様を現行仕様から除外し、履歴資料として明記
- 正規Asset Pathとローカル実ファイルを照合
- 既存7背景の実フォーマットと変換時容量を検査

ゲームロジック、DBスキーマ、課金仕様、確率、価格は変更していない。

## 2. 文書責務

| 領域 | 正本 |
| --- | --- |
| ゲームルール・DB・画面固有機能 | `game_spec.md` / 各`spec_*.md` |
| 共通UI実装値 | `ui_design_system.md` |
| マイページ固有情報・導線 | `mypage_design_policy.md` |
| キャラクター個別設定 | `assets_characters.md` |
| Art Direction・制作判断・Asset QA | `art_bible.md` |
| 既存個別生成プロンプト | `visual_prompt_sheet.md` |
| 旧来のアート詳細 | `visual_concept.md`（Art Bible優先） |

## 3. 拠点契約

### 世界・移動・クエスト

新宿、渋谷、池袋、六本木、秋葉原、川崎、横浜の7拠点。

### 現行GvG支配・レイド出現対象

新宿、渋谷、池袋、六本木、秋葉原の5拠点。`BASE_MAP_MASTER`、ギルド、GvG、ランキングの現行コードがこの5拠点を参照する。

川崎、横浜をGvG・レイドへ追加する場合はArt Bible整理ではなくゲームルール変更として扱う。

### 旧4拠点

ネオンタワー、ディープドック、ジャンクバザール、キタクラゲートは廃止済み名称。`spec_guild_gvg_raid.md`第2章は履歴資料として明示した。

## 4. 実装側に残る旧参照

本クリーンアップでは変更していない。

- `src/hooks/useBattle.ts`: 旧4拠点名、旧支配処理
- `src/app/lib/screenManifests.ts`: `bg_base_*.png`
- `src/app/components/HomeTab.tsx`: 現行都市から旧背景ファイルへの互換マッピング
- `src/app/components/CharacterTab.tsx`: 旧背景ファイルへの互換マッピング
- `supabase/baseline_dev_schema.sql`および初期migration: 旧既定値・移行前データ

大規模renameは行わず、GvG／バトル再実装時の互換撤去対象とする。

## 5. Asset Path監査

正規ディレクトリは全て存在する。

- `public/bg/`
- `public/characters/`（60ファイル）
- `public/raw_assets/`（168ファイル）
- `public/skills/`（105ファイル）
- `public/equipments/`（148ファイル）

拠点背景の仕様パスは`/bg/bg_street_<area>.png`へ統一した。`bg_base_*.png`は互換参照が残るレガシーアセットとする。

## 6. 背景画像フォーマット

`bg_street_*.png` 7ファイルは全てJPEG実体だった。

- 現在: JPEG実体を`.png`名で配信
- PNG再エンコード試算: 新宿 980,243 bytes → 2,079,987 bytes（約2.12倍）
- 判断: 初期表示性能を悪化させるため、本作業ではPNG変換しない
- 次工程: `.jpg`へリネームし、コード参照、seed、`quest_towns.bg_image`を同時移行する

この次工程はマスタデータ／不足画像工程で実施し、本番DB参照を残したままファイルだけ変更しない。

## 7. 残タスク

- 既存60キャラクター実アセットの視覚監査
- 装備・スキル実アセットの視覚監査
- 背景7枚の`.jpg`同時移行
- 旧4拠点互換コードの撤去可否判断
- 川崎・横浜をGvG／レイド対象へ追加するかのゲーム仕様判断
