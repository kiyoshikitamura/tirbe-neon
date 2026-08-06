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

## Supabase Dashboard（管理者操作）

1. Authentication > Providers > Googleを有効化する
2. Google Cloudで発行したクライアントIDとクライアントシークレットを登録する
3. Authentication > URL Configurationを設定する
   - Site URL: `https://tirbe-neon.vercel.app`
   - Redirect URLs: `https://tirbe-neon.vercel.app/**`
4. 保存後、本番URLでGoogleログインを試す

クライアントシークレットはチャットやリポジトリへ保存しない。Google Cloud/Supabaseの管理画面へだけ入力する。
