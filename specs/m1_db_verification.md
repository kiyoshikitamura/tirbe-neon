# Open Beta M1 開発DB検証記録

更新日: 2026-08-12

## 対象

- Development Supabase project: `vosbyukxmskvisbgleug`
- Production project `ktpolnkyyfkowxdmijww` は未変更
- 適用: `20260812000105`、`20260812000107`、`20260812000108`
- `20260812000104`と`20260812000106`の最終定義は`107`に包含されるため、既存Development DBへの手動適用では省略

## 設定確認

- Anonymous Sign-Ins: ON
- Allow manual linking: ON
- migration前preflight: 全自動項目PASS
- migration後postflight: 8/8 PASS

## 実DBで成功した検証

- 未認証anonキーからM1 RPC 3件への到達拒否（`42501`）
- 署名済み匿名ユーザーの作成
- 初期オンボーディング状態の取得
- ユーザーネームだけを受け取る初期化
- 同一初期化RPC再送の冪等性
- スターターキャラクターが1件だけ付与されること
- 匿名状態での認証完了拒否
- 空白・大文字小文字を正規化したユーザーネーム重複拒否（`23505`）
- 別匿名ユーザーからの`users`／`user_characters`直接参照が0件になること
- 3 RPCのSECURITY DEFINER、`search_path=public`、authenticated実行権限
- 旧任意引数初期化RPCのauthenticated実行権限剥奪

## QAデータ

以下はDevelopment DBに作成された匿名QAユーザー。実DB検証の再現記録として保持し、削除時はAuth userを起点にCASCADE対象を確認する。

- `5dd74805-2af2-4d22-b32c-2b7e4c289d55` / `M1phjzn1`
- `4c063cd5-55e0-498c-b3b9-b31e925ff217` / `NPHKVZR`
- `f99fc03d-9832-4f80-a656-163b245b3de6` / プロフィール未作成
- `d1e55300-e0a7-4b9b-b682-1ea5bf7ec034` / `M1phocp6`

## 未完了

- 実メールの確認リンク往復、パスワード設定、同一UUID保持、再ログイン
- 実Google OAuth項目は下記の往復確認で完了。
- 認証連携成功・失敗・衝突のゲーム側監査ログ（Supabase Auth監査ログとは別要件）

## 2026-08-12 実Google OAuth往復確認

- Development Supabase `vosbyukxmskvisbgleug` で確認。
- 匿名プロフィール `fa8e811c-f75a-4231-9927-9532a6eed9cf` のチュートリアル完了後にGoogle identity連携を実施。
- Google OAuth callback後、タイトル画面で再認証を要求せず認証完了処理へ復帰し、マイページ到達を確認。
- ログアウト後のGoogle再ログイン、単一Google identity、同一ゲームプロフィール、認証後の直接マイページ復帰を確認。
- 誤った旧導線で作られたゲームプロフィールなしの孤立Google Auth userは、参照SQLで `has_game_profile = false` を確認してから開発環境で削除した。
- 実メールの確認リンク往復は引き続き未確認。
- ゲーム側の認証監査ログ（Supabase Auth監査ログとは別要件）は引き続き未実装。
