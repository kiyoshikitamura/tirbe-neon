# 【TRIBE NEON】本番環境 / 開発環境 構築 ＆ デプロイガイド (Supabase & Vercel Setup Guide)

本ドキュメントは、本作『TRIBE NEON』を開発環境（Local/Staging）および本番環境（Production）で分離し、**Supabase** と **Vercel** へ安全かつ正確に構築・デプロイするための設定手順書です。

## Supabase本番反映前の必須確認

本番DB操作の直前に`npm run verify:supabase-target`を実行し、`.env.production`のプロジェクトとCLIのリンク先が一致することを確認する。不一致またはリンク情報不在の場合、DB操作を続行しない。

本番DBは既存SQLを手動適用して構築され、マイグレーション履歴の基準点が未確定である。履歴を整理するまでは`supabase db push`で全差分を適用せず、レビュー済みSQLだけを`supabase db query --linked --file <file>`で実行する。

> 現在は不足機能の実装・実機検証段階であり、Vercel Production URLと本番Supabaseを検証環境として使用している。一般ユーザー向けの正式リリースと本番データ移行は、別途承認されたリリース計画で実施する。

---

## 1. 概要・環境分離アーキテクチャ

- **公式 Git リポジトリ**: `https://github.com/kiyoshikitamura/tirbe-neon.git`

| 環境 (Environment) | ホスティング (Vercel) | データベース (Supabase) | 目的 |
| :--- | :--- | :--- | :--- |
| **開発環境 (Development)** | Local (`localhost:3000`) / Vercel Preview | 開発用Supabaseプロジェクト | 機能開発、単体・結合テスト、モック検証 |
| **本番環境 (Production)** | Vercel Production (`*.vercel.app` / カスタムドメイン) | 本番用Supabaseプロジェクト | リアルプレイヤーへの実サービス提供 |

---

## 2. Supabase の設定手順 (Development & Production)

開発用Supabaseへの通常適用と、本番Supabaseへの実機検証用適用を明確に分離します。本番への変更は対象SQLと接続先を確認したうえで個別に適用します。

### Step 1: プロジェクトの作成
1. [Supabase Dashboard](https://supabase.com/dashboard) にログインし、既存の開発用プロジェクトを確認します。
2. 既存環境を利用できない場合だけ、開発用プロジェクト `tribe-neon-dev` を作成します。

### Step 2: DBスキーマ・マイグレーションの適用

`supabase/migrations/` をDBスキーマの唯一の正本とします。ルート直下の `setup_schema.sql` および `migration_*.sql` は過去の手作業用であり、新規環境へ混在適用してはいけません。

1. 対象Supabaseプロジェクトで、適用済みmigration historyとバックアップ取得状況を確認する。
2. `supabase/migrations/` をファイル名の昇順で適用する。
3. 適用後にテーブル、RLSポリシー、RPC、初期マスタデータを確認する。
4. 開発環境で主要導線と認可テストを実施し、migration historyと結果を記録する。

> 注意: 現行スキーマにはRLSおよびRPCの継続監査項目があります。本番へ適用するSQLは、対象を限定して事前検証と適用後確認を行ってください。

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

#### 1. Production (本番環境) の変数設定（現段階では実施しない）
本番リリースは未実施のため、現段階では `Production` へ変数を登録しない。本番用Supabaseの接続情報は、別途承認されたリリース計画で設定する。

#### 2. Preview / Development (開発・検証環境) の変数設定
- Target: `Preview` および `Development` にチェック
- `NEXT_PUBLIC_SUPABASE_URL`: 開発用SupabaseのProject URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 開発用Supabaseのanon public key
- `NEXT_PUBLIC_APP_ENV`: `development`

> `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` はローカルまたはCI専用であり、VercelのProduction・Previewには登録しない。

---

## 4. ローカル環境での切替方法

## 4.1 CI品質ゲート

`.github/workflows/quality.yml` で、push／Pull Request時に `npm ci`、`npm run typecheck`、Next.jsビルドを実行する。既存Lintエラーは別タスクとして段階的に解消する。

ローカル開発時は、ルートディレクトリの `.env.local` または `.env.development` を参照します。

- **開発モード起動**:
  ```bash
  npm run dev
  ```
- **本番ビルド検証**:
  ```bash
  npm run build
  ```

`next/font/google` による外部フォント取得が失敗するネットワーク環境では、現時点のビルドは失敗します。リリース前にフォントを自己ホストまたはシステムフォントへ切り替え、外部アクセスなしでもビルドできる状態にしてください。

---

## 5. チェックリスト (Deployment Checklist)

デプロイ前および本番公開前に以下の項目を必ずチェックしてください。

- [ ] `supabase/migrations/` の適用済み一覧と対象環境のmigration historyが一致しているか
- [ ] RLSが本人・必要な公開情報・管理処理だけを許可し、`FOR ALL USING (true)` が残っていないか
- [ ] 本番ロールからテスト用／管理用RPCを実行できないか
- [ ] 経済・対戦・報酬の更新がクライアント直接更新ではなく所有者検証済みRPCで行われるか
- [ ] Vercel の Production 環境変数に本番用 Supabase URL / Anon Key が登録されているか
- [ ] Supabase Auth の Redirect URL に本番ドメインが追加されているか
- [ ] `npm run lint`、自動テスト、`npm run build` がCI・ローカルで成功するか
