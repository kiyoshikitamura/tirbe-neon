# Supabase migration baseline手順

## 現状

- 開発プロジェクトには既存の手動構築スキーマが存在する。
- `_supabase_migrations.schema_migrations` が存在せず、CLIのremote migration historyも空である。
- Docker Desktopが利用できないため、`supabase db dump` による完全な自動スナップショットは未実施。

2026-08-03にPostgreSQL 17 Client Toolsの`pg_dump`を使用し、Dockerなしでschema-only dumpを取得した。成果物は `supabase/baseline_dev_schema.sql`（約282KB）である。
復元ツールでTOCを検証しやすいcustom形式も `supabase/baseline_dev_schema.dump` として取得した（TOC 700 entries）。
SQL形式には`COPY`／`INSERT`が含まれず、データを含まないschema-onlyであることも確認した。

## 実施手順

1. 開発DBのスキーマ、RLS、RPC、インデックスを取得する（取得済み: `supabase/baseline_dev_schema.sql`）。
2. 取得結果をレビューし、既存データを変更しない初期baseline SQLを作成する。
3. baseline以降の追加分を `supabase/migrations/` の時系列migrationとして整理する。
4. 検証用Preview DBへbaselineと追加migrationを適用する。
5. 主要画面、ガチャ、ショップ、対戦、ログインを回帰確認する。
6. 差分がないことを確認してから、開発DBのmigration履歴を登録する。

## 禁止事項

- baseline確定前に開発DBへ `supabase db push` を実行しない。
- 本番DBをbaseline取得先・検証先にしない。
- 既存データを削除して履歴を合わせない。

## 完了条件

- Preview DBを空の状態から再現できる。
- 開発DBの既存ユーザー・マスタ・残高を維持できる。
- CLI migration listで適用履歴を再現できる。

## Preview DBへの復元例

custom形式を使用する場合（接続先はPreview専用DBに限定する）:

```powershell
$env:PGPASSWORD = '<preview-db-password>'
pg_restore --no-owner --no-privileges --clean --if-exists `
  --host <preview-host> --port 5432 --username <preview-user> --dbname postgres `
  .\supabase\baseline_dev_schema.dump
```

本番DB、既存開発DB、ユーザーデータを含むDBへはこのコマンドを実行しない。
