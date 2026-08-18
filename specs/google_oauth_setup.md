# Google OAuth 本番設定

## アプリ側の状態

- ログイン入口は `Googleでログイン` に統一する
- OAuth完了後の戻り先は現在開いているオリジン
- 本番URL: `https://tirbe-neon.vercel.app`
- Supabaseプロジェクト: `ktpolnkyyfkowxdmijww.supabase.co`

## Google Cloud Console（管理者操作）

1. Google Cloud Consoleで対象プロジェクトを開く
2. OAuth同意画面を設定する
   - 公開前はテストユーザーに、QAで使用するGoogleアカウントを追加する
3. 「認証情報」からOAuth 2.0クライアントIDを作成する
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクトURI:
     `https://ktpolnkyyfkowxdmijww.supabase.co/auth/v1/callback`
4. 発行されたクライアントIDとクライアントシークレットを控える

### Developmentプロジェクトでの実OAuth確認

開発Supabaseプロジェクト `vosbyukxmskvisbgleug` でOAuthを確認する場合は、
同じGoogle OAuth 2.0クライアントの「承認済みのリダイレクトURI」に次も追加する。

`https://vosbyukxmskvisbgleug.supabase.co/auth/v1/callback`

これはGoogleからSupabaseへ戻るURIである。アプリへ戻る
`http://127.0.0.1:3100/**` はGoogle Cloudではなく、開発Supabaseの
Authentication > URL Configuration > Redirect URLsへ登録する。

## Supabase Dashboard（管理者操作）

1. Authentication > Providers > Googleを有効化する
2. Google Cloudで発行したクライアントIDとクライアントシークレットを登録する
3. Authentication > URL Configurationを設定する
   - Site URL: `https://tirbe-neon.vercel.app`
   - Redirect URLs: `https://tirbe-neon.vercel.app/**`

4. 保存後、本番URLでGoogleログインを試す

クライアントシークレットはチャットやリポジトリへ保存しない。Google Cloud/Supabaseの管理画面へだけ入力する。

## Open Beta: 匿名ユーザーへのGoogle identity連携

- Supabase DashboardのAuthentication > General Configuration > User Signupsで「Allow manual linking」を有効にする。`linkIdentity()`にはこの設定が必須。
- OAuth開始前の匿名ユーザーIDと、リダイレクト復帰後のユーザーIDが一致する場合だけチュートリアル認証を完了する。
- Google identityが別ユーザーに登録済みの場合は連携を拒否し、自動的なアカウント統合や進行データ移送を行わない。
- キャンセル／失敗時は匿名セッションと進行を維持し、同じ画面から再試行できるようにする。
- 本書記載のProduction URL `https://tirbe-neon.vercel.app` は綴りを含め、実際のVercelドメインと公開前に照合する。確認なしに変更しない。
