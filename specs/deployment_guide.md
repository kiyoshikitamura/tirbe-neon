# 【TRIBE: NEON REIGN】本番環境 / 開発環境 構築 ＆ デプロイガイド (Supabase & Vercel Setup Guide)

本ドキュメントは、本作『TRIBE: NEON REIGN』を開発環境（Local/Staging）および本番環境（Production）で分離し、**Supabase** と **Vercel** へ安全かつ正確に構築・デプロイするための設定手順書です。

---

## 1. 概要・環境分離アーキテクチャ

- **公式 Git リポジトリ**: `https://github.com/kiyoshikitamura/tirbe-neon.git`

| 環境 (Environment) | ホスティング (Vercel) | データベース (Supabase) | 目的 |
| :--- | :--- | :--- | :--- |
| **開発環境 (Development)** | Local (`localhost:3000`) / Vercel Preview | 開発用Supabaseプロジェクト | 機能開発、単体・結合テスト、モック検証 |
| **本番環境 (Production)** | Vercel Production (`*.vercel.app` / カスタムドメイン) | 本番用Supabaseプロジェクト | リアルプレイヤーへの実サービス提供 |

---

## 2. Supabase の設定手順 (Development & Production)

開発用・本番用の **2つの独立した Supabase プロジェクト** を作成し、DBスキーマを適用します。

### Step 1: プロジェクトの作成
1. [Supabase Dashboard](https://supabase.com/dashboard) にログインし、2つのプロジェクトを作成します。
   - 開発用プロジェクト: `tribe-neon-dev`
   - 本番用プロジェクト: `tribe-neon-prod`

### Step 2: DBスキーマ・マイグレーションの適用
作成した各プロジェクトの SQL Editor にて、以下の順番で SQL スクリプトを実行します。

1. **ベーススキーマの作成**:
   - [setup_schema.sql](file:///d:/dev/tribe-neon/setup_schema.sql) の全内容をコピペして実行（基本テーブル、RPC、初期データ挿入）。
2. **各マイグレーションの適用** (未適用の場合):
   - `migration_add_bbs_tables.sql`
   - `migration_add_equipment_masters.sql`
   - `migration_add_patrol_system.sql`
   - `migration_add_pvp_rewards.sql`
   - `migration_add_user_level.sql`
   - `migration_extend_guild_system.sql`
   - `migration_gvg_enhancement.sql`
   - `migration_v2_character_progression_gacha.sql`
   - `migration_add_pity_and_tomodachi.sql` (天井＆友達テーブル)

### Step 3: Auth (認証) の Redirect URL 設定
Supabase Dashboard -> **Authentication** -> **URL Configuration** にて設定します。

- **開発用 (`tribe-neon-dev`)**:
  - Site URL: `http://localhost:3000`
  - Additional Redirect URLs: `http://localhost:3000/auth/callback`
- **本番用 (`tribe-neon-prod`)**:
  - Site URL: `https://your-production-app.vercel.app` (本番ドメイン)
  - Additional Redirect URLs: `https://your-production-app.vercel.app/auth/callback`

---

## 3. Vercel の設定手順 (Environment Variables)

Vercel へリポジトリを連携し、環境ごとに環境変数を設定します。

### Step 1: Vercel プロジェクトのインポート
1. [Vercel Dashboard](https://vercel.com/dashboard) にて `New Project` を選択。
2. GitHub / Git リポジトリ `tribe-neon` を選択してインポートします。
3. Framework Preset: **Next.js** を選択。

### Step 2: 環境変数 (Environment Variables) の登録
Vercel Dashboard の **Settings** -> **Environment Variables** にて、環境ごとに以下の変数を設定します。

#### 1. Production (本番環境) の変数設定
- Target: `Production` にチェック
- `NEXT_PUBLIC_SUPABASE_URL`: 本番用SupabaseのProject URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 本番用Supabaseのanon public key
- `NEXT_PUBLIC_APP_ENV`: `production`

#### 2. Preview / Development (開発・検証環境) の変数設定
- Target: `Preview` および `Development` にチェック
- `NEXT_PUBLIC_SUPABASE_URL`: 開発用SupabaseのProject URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 開発用Supabaseのanon public key
- `NEXT_PUBLIC_APP_ENV`: `development`

---

## 4. ローカル環境での切替方法

ローカル開発時は、ルートディレクトリの `.env.local` または `.env.development` を参照します。

- **開発モード起動**:
  ```bash
  npm run dev
  ```
- **本番ビルド検証**:
  ```bash
  npm run build
  ```

---

## 5. チェックリスト (Deployment Checklist)

デプロイ前および本番公開前に以下の項目を必ずチェックしてください。

- [ ] 本番用Supabaseプロジェクトへ `setup_schema.sql` および `migration_add_pity_and_tomodachi.sql` が適用されているか
- [ ] Vercel の Production 環境変数に本番用 Supabase URL / Anon Key が登録されているか
- [ ] Supabase Auth の Redirect URL に本番ドメインが追加されているか
- [ ] `npm run build` がローカルでエラーなく通過するか
