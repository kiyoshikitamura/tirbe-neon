# 🏆 TRIBE: NEON REIGN - マイページUI (HomeTab ＆ Header) 完全ゼロベースUI再構築 完了レポート

## 概要
ユーザー様からの最新UI再構築仕様および機能要求に基づき、マイページ (`HomeTab`)、ヘッダー (`Header`)、フッター (`Footer`)、共通レイアウト (`globals.css`)、および暗号メッセージアプリ『トライブ』 (DM機能) のデータベース同期ロジックのゼロベース完全再構築を実施いたしました。

---

## 🛠️ 主な変更点 ＆ 実装内容

### 1. PC表示中央寄せ規格の修復 (`src/app/globals.css`)
- PC環境で右寄りに崩れる不具合を修正し、画面中央に角ばった縦型モバイル枠 (`max-width: 430px; margin: 0 auto !important;`) でシャープに表示。

### 2. 全17個の生成アイコン ＆ アイコン直下テキスト化 (`src/app/components/HomeTab.tsx` / `HomeTab.css`)
- `public/ui/icon_*.png` を全面使用し、インラインSVGを排した画像アイコン＋直下テキストラベル構造に統一。
- **左小アイコン (6個)**: ミッション、ランキング、友達、コミュニティ(BBSから変更)、レイド、マップ
- **右小アイコン (4個)**: マイバッグ、お知らせ、プレゼントBOX、設定

### 3. モバイルヘッダー 2行構成 (`src/app/components/Header.tsx` / `Header.css`)
- **Row 1**: 通り名(称号) ｜ プレイヤー名 ｜ Lv. ｜ 所属ギルド ｜ (レイド中アラート)
- **Row 2**: 取合力(総合力・金文字カンマ区切り) ｜ 💵Cash (`/ui/icon_cash.png`) ｜ 💎Dia (`/ui/icon_dia.png`) ｜ ⚡AP (`100/100` 表記)

### 4. ビジュアルエリア (50vh) ＆ 重なり順 (z-index) レイヤー装飾
- 最上段HUD: `拠点: [拠点名] ｜ 支配: [ギルド名]` ＋ 右側 `[拠点移動]` ボタン。
- 最上段HUD直下中央: 薄い透過グレー背景の**取合力表示パネル**（文字サイズ大、カンマ桁区切り `12,500`）。
- **任意背景選択機能**: 拠点自動連動背景（デフォルト）または所持背景から自由選択。
- **重なり順 (z-index)**: 背景 (z:1) → 置物インテリア (z:2) → リーダー立ち絵キャラクター (z:3) → 称号プレートバナー (z:4) → 前面エフェクト (z:5)
- **大ボタン (ネガティブマージン -48px)**: 🔴連合 (`menu_allies.png`, 80px)、🔵喧嘩 (`menu_fight.png`, 96px)、🟢制圧 (`menu_conquest.png`, 80px)

### 5. イベントバナーエリア
- 大ボタンの直下に設置。複数バナー画像、左右スライドボタン (`‹` `›`)、インジケータードット、4秒間隔の自動スライドタイマー。

### 6. 1行チャットプレビュー ＆ 暗号メッセージアプリ『トライブ』モーダル
- バナー下に全体チャット最新1行をプレビュー表示。
- タップで『トライブ』モーダル起動。「全体」「ギルド」「個人チャット(DM)」切り替え、送信相手選択ドロップダウン、メッセージ送受信。

### 7. フッターナビゲーションのショップ化 (`src/app/components/Footer.tsx`)
- 5項目: `マイページ` (`icon_footer_mypage.png`)、`ギルド` (`icon_footer_guild.png`)、`キャラ` (`icon_footer_character.png`)、`ガチャ` (`icon_footer_gacha.png`)、`ショップ` (`icon_footer_shop.png`)

### 8. データベース設計 ＆ SQLマイグレーション (`migration_add_tribe_dm_and_decorations.sql`)
- `users` テーブルへの `selected_bg_mode`, `interior_item` カラム追加。
- `direct_messages` (個人チャットDM用テーブル & RLS / Supabase Realtime 有効化)。
- `user_profile_decorations` (所持背景・称号・インテリア等の所持・解放管理テーブル)。
- `DROP POLICY IF EXISTS` を備えた安全な再実行対応 SQL ファイルを提示。

---

## 🔍 検証結果
- `npm run build` による Next.js 16 (Turbopack) の生産ビルド、TypeScript 型チェック、静的ページ生成が **エラー 0 で正常完了**。
- `git commit` および `git push origin main` を完了。
