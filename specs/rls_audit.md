# RLS監査メモ（開発環境）

最終確認: 2026-08-03

## 確認結果

- 開発DBのpublicテーブル: 58（2026-08-03再確認）
- RLSポリシー: 61
- `USING (true)` または `WITH CHECK (true)` に該当するポリシー: 48（2026-08-03再確認）

現状は既存画面の移行を優先しているため、所有者検証を伴わない広いポリシーが残っています。本番リリース前に必ず是正します。

## 優先監査対象

1. `users`
2. `user_characters`
3. `user_skills`
4. `user_equipments`
5. `user_items`
6. `user_gacha_pity_points`
7. `user_daily_gacha_claims`
8. ガチャマスタ・報酬関連テーブル

## 追加確認（2026-08-03）

- `user_daily_gacha_claims` と `user_gacha_pity_points` は、既に `auth.uid() = user_id` の所有者ポリシーが設定されている。
- `user_characters`、`user_skills`、`user_equipments`、`user_items` は `USING (true)` / `WITH CHECK (true)` の広いポリシーが残っている。
- 後者4テーブルは、公開プロフィール・初期化処理・既存画面の読み取り影響を確認してから、所有者ポリシーへ段階移行する。
- `useBattle.ts` では他ユーザーのヘルパーキャラクター・装備・スキルを読み取るため、単純な所有者限定ではなく、公開ヘルパー用の読み取りビューまたは限定列ポリシーが必要になる。

### ヘルパー公開データの推奨案（未承認）

`useBattle.ts` の直接テーブル参照を、将来的に `get_public_battle_loadout` RPCへ置き換える。返却項目は以下に限定する。

- 表示名（username）
- キャラクターID、レベル、覚醒レベル
- 戦闘計算に必要な装備ID、レベル、強化値、ランダムオプション
- 装備中スキルID、限界突破値、スロット

ユーザーの通貨、所持品、未装備データ、内部ID一覧は返却しない。

## 是正方針

- ユーザー所有データは `auth.uid() = user_id` を基本条件にする。
- 公開ランキング等は読み取り専用の公開ビューへ分離する。
- 通貨、ガチャ、報酬、育成の書き込みは所有者検証付きRPCに限定する。
- `SECURITY DEFINER` RPCは `search_path = public` を固定し、対象ユーザーを `auth.uid()` と照合する。
- 変更前後に、他ユーザーID指定・未認証・負数・重複送信の拒否テストを実行する。

## 適用方針

既存開発ユーザーへの影響を避けるため、RLS変更は機能単位でmigrationを追加し、Preview環境で回帰確認後に適用します。本番DBには未適用です。

2026-08-03時点で、`useBattle.ts` のヘルパー・PvP・GvG読み取りは公開ロードアウト／ロスターRPCへ切り替え済み。次段階で、対象4テーブルの直接読み取りポリシーを所有者限定へ変更する回帰テストを実施する。

追加確認: `GameContext.tsx` のギルドメンバー一覧は、他メンバーのリーダーキャラクターを直接参照している。RLS変更前に、この表示も公開ロスターRPCへ切り替える必要がある。

`users` テーブルは現在も全許可ポリシーで、username・avatar・ランキング表示など複数の公開読み取り用途と、初期化・プロフィール更新が混在している。公開プロフィール用ビューと本人更新RPCを分離してから是正する。

追加の直接参照として、オンライン人数、本人プロフィール更新、フレンド一覧・申請、ショップ／ギルド周辺処理が残っている。これらを公開プロフィールRPCまたは本人専用RPCへ置き換えた後に、`users` のRLSを変更する。
## 2026-08-03 broad policy follow-up

The latest read-only audit found 48 broad `USING/WITH CHECK (true)` policies. Master-table public SELECT policies are intentional; the remaining ALL policies cover social, payment, PvP/GvG/raid, and user progression tables. These should be hardened feature-by-feature after replacing client writes with ownership- or RPC-based controls. No policy changes were made in this audit.
The ownership scan found `user_id` columns on `user_avatar_parts`, `user_avatars`, `user_login_bonuses`, `user_missions`, `user_patrols`, and `user_power_rankings`. The first five are candidates for `auth.uid() = user_id` policies after Preview regression; `user_power_rankings` requires a public ranking read path and should remain behind its RPC before tightening.
After applying `20260805000020_owner_rls_user_progress.sql` in the development project, the broad-policy count decreased from 48 to 43. The five owner-scoped tables are `user_avatar_parts`, `user_avatars`, `user_login_bonuses`, `user_missions`, and `user_patrols`; `user_power_rankings` remains intentionally deferred until all public reads use the ranking RPC.
