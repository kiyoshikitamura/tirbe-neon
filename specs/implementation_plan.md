# 実装計画：既存開発環境からの移行と機能完成

最終更新: 2026-08-03

## Open Beta M1進捗（2026-08-12）

- M1-1: 認証・チュートリアル状態遷移を確定。
- M1-2: 新規匿名開始／既存ログイン入口、オンボーディング状態RPC、既存ユーザー互換判定を実装。型検査とモックE2E 6件は通過。
- M1-2は `IMPLEMENTED / DB VERIFIED`。
- M1-3: 名前のみの原子的初期化、正規化ユーザー名の一意化、二重付与防止、チュートリアル中断復帰を実装。対象モックE2E 5件は通過。
- M1-3は `IMPLEMENTED / DB VERIFIED`。
- M1-4: メール認証の即時連携／確認メール待ち、コールバック復帰、同一UUID保持、既存メール衝突拒否、認証完了RPCの冪等化を実装。対象モックE2E 3件は通過。
- M1-4は `IMPLEMENTED / MOCK VERIFIED`。Open Betaの必須認証経路はGoogle実証で成立しており、実メール往復は追加QAとして継続する。
- M1-5: Google OAuth連携、リダイレクト復帰時の同一UUID検証、キャンセル再試行、既存Google identity衝突拒否を実装。対象モックE2E 4件はテスト本体が通過（Windows上のPlaywright開発サーバー終了待ちは既知の問題）。
- M1-5は `IMPLEMENTED / DB VERIFIED`。Manual Linking、Google Provider、Redirect URLを設定し、匿名UUIDを維持した実Google OAuth連携と再ログインをDevelopment DBで確認した。
- M1-6: 認証方式の単一制約を完了RPCの再送時と再ログイン時にも検査し、二重identity、方式変更、期限切れOAuth intent、認証不整合時のゲーム画面ブロックを実装。認証系モックE2E全16件は通過。
- M1-6はRPC定義・権限を `DB VERIFIED`。provider identity異常系はモック検証済みで、実provider検証はM1-8へ継続。
- M1-7: Development DBへM1 migration最終形を適用。preflight／postflight全PASS、未認証anon拒否、署名済み匿名初期化、冪等性、正規化名重複拒否、他者RLSを実DBで確認した。詳細は`specs/m1_db_verification.md`を参照。
- M1-8: 実Googleで同一UUIDの認証昇格、単一identity整合、ログアウト、再ログインを確認。OAuth復帰直後はタイトルを再操作せずマイページへ遷移するよう補正した。
- M1はGoogle認証経路で `IMPLEMENTED / DB VERIFIED / UI RECHECK PENDING`。直接マイページ復帰の再確認、実メール往復、ゲーム独自の認証監査ログは追加QAとして継続するが、M2着手のブロッカーにはしない。

## Open Beta M2進捗（2026-08-12）

- M2-1 `IMPLEMENTED / DB NOT VERIFIED`: 通常クエストの時短料金を残り時間からサーバー計算し、CASHは残り1分100・JST日次3回、ダイヤは残り1時間10・回数無制限へ修正。UIの料金・残回数表示とモックの原子的検証を追加した。
- M2-1はDevelopment DBのmigration／権限postflightを全PASS。実クエストでCASH／ダイヤ消費と日次上限を確認するまで `UI RECHECK PENDING`。
- M2-2 `IMPLEMENTED / DB VERIFIED / UI RECHECK PENDING`: クエスト開始RPC内で経過AP回復を確定してからAPを消費し、確定後の残APを応答してUIへ反映するよう修正。Development DB postflightは全PASS。満タン中の古い回復時刻から消費APが直後に戻る問題を防止した。
- M2-3 `IMPLEMENTED / DB VERIFIED / AUTOMATED E2E PASS / MANUAL UI PASS`: 通常派遣のNPCバトルをOpen Beta MUSTへ昇格。全21公開クエストに100%遭遇のNPCマスタを割り当て、所有済み編成・NPCマスタ・サーバーseedからQUESTリプレイを生成し、`resolve-battle` が勝敗を確定して派遣結果を書き込む。クライアントからの直接勝敗更新は廃止した。Developmentではチュートリアル勝利からRULE_GUIDE遷移、通常派遣の未決着報酬拒否・敗北保存・決着後報酬受取を実DB E2Eで確認済み。Edge FunctionのブラウザCORSも修正・再デプロイ済み。実画面の派遣・バトル・報酬遷移も確認済み。装備・装着スキルのサーバー正規化とサーバーイベント列の完全再生は次のM2-4で追加する。
- M2-4a `IMPLEMENTED / DB VERIFIED`: 172件の装備戦闘マスタをDBへ固定し、QUESTリプレイ生成時に所有・装着状態をサーバー側で検証してHP/ATK/DEFのLv・突破補正と、固定値のSPD/LUKを正規スナップショットへ加算する。装着スキルはID・slot・`plus_val`・確定仕様の+41%効果倍率を監査用に保存する。個別対象・クールダウン列が現スキルマスタに存在せず、専用20件も正式設定前のため、効果を推測して実行せず通常攻撃へフォールバックする。Development postflightは9/9 PASS。
- M2-4b `IMPLEMENTED / AUTOMATED E2E PASS / MANUAL UI RECHECK PENDING`: QUEST画面をサーバー正規スナップショットへ置換し、保存済み`ACTION/DAMAGE/HEAL/STATUS/DEFEAT/RESULT`列を既存のカットイン、ターゲット線、HP、ダメージポップアップ、ログへ順次再生する。QUEST中は旧ローカルAIとクライアント専用開幕効果を停止し、再生位置をブラウザに保存する。DevelopmentブラウザE2Eで、画面ログのダメージ値とDB確定イベント値の一致、およびチュートリアル勝利からRULE_GUIDEへの遷移を確認済み。
- 共通UX `IMPLEMENTED / UI RECHECK PENDING`: 操作直後から非同期完了まで共通ボタンを自動ロックし、同期操作も次paintまで再タップを拒否する。確認ダイアログは親の後処理を待たず即時に閉じ、全画面通信ブロック中はspinnerを表示する。ガチャ全操作にも処理中fieldsetロックを適用した。
- 認証復帰UX `IMPLEMENTED / LOCAL VERIFIED / UI RECHECK PENDING`: ウィンドウ復帰時にSupabase Authが再通知する同一ユーザーの`SIGNED_IN`と`TOKEN_REFRESHED`では、`authLoading`、オンボーディング再検査、全bootstrapを起動しない。初回セッション、別ユーザー、`USER_UPDATED`は従来どおり検証する。イベント分岐テストと型検査はPASS。
- M3-1 `AUDITED`: 装備の単体装着が2回のクライアント直接UPDATEで非原子的、一括装着の旧RPCが任意`p_user_id`を信用、さらに自動装着が武器1枠・アクセ3枠となっており、確定仕様の武器2枠・アクセ2枠と不一致だった。育成RPCも同様に呼出側user ID・料金を信用するためM3-2bで継続是正する。スキルはアカウント単位恒久解放と複数キャラ装着を現`user_skills`単一行で表現できないため、DB/UI影響を分離して扱う。
- M3-2a `IMPLEMENTED / LOCAL VERIFIED / DB APPLY PENDING`: 装備の単体・一括装着/解除を`auth.uid()`、キャラ/装備所有、7枠部位、専用キャラ、他キャラ装着中の検査を持つ原子的RPCへ統一した。直接UPDATEと旧caller-supplied user ID RPCを拒否し、UI候補を部位で絞り、state反映待ちで装着が無反応になる経路も修正。モック正常/異常系、型、対象Lintを通過した。
- M3-2aはDevelopment postflight 7/7 PASSで `DB VERIFIED`。
- M3-2b1 `DB VERIFIED`: 覚醒をDBの`character_awakening_master` 5段階（5,000 / 15,000 / 35,000 / 75,000 / 150,000 CASH）でサーバー確定し、任意user ID・料金指定を廃止した。Development postflight 6/6 PASS。
- M3-2b2 `DB VERIFIED / UI RECHECK PENDING`: ユーザー承認のOpen Beta暫定値（キャラLv: 1素材/100 CASH、装備Lv: 1素材/50 CASH、装備/スキル突破: 次の+値×1,000 CASH・素材1個）をマスタ化した。キャラ/装備Lv、装備/スキル突破を`auth.uid()`・所有権・マスタ料金・解放上限・原子的消費の4 RPCへ切替え、クライアント指定user ID/料金/素材を廃止した。Development postflight 8/8 PASS。値はOpen Betaリリース判定時の最終ジャッジ対象とする。
- M3-2b3 `IMPLEMENTED / LOCAL VERIFIED / UI RECHECK PENDING`: キャラLvボタンが所有UUIDを素材IDとして渡す不具合を修正。装備タブへLv強化・同名/ハンマー突破、スキルタブへ同名/素材突破の対象選択UIを追加し、所持素材・CASH・Lv/+値を表示した。
- M3-2c `IMPLEMENTED / DB VERIFIED / REAL DB E2E PASS / UI RECHECK PENDING`: 個別スキル装備の非同期state競合と一括推奨のRPC引数不一致・エラー黙殺を修正。`auth.uid()`、キャラ/スキル所有、有効マスタ、覚醒解放枠、専用条件を検証する原子的な個別/解除/一括RPCへ統一し、直接UPDATEと旧caller-supplied user ID RPCを拒否する。スロット選択→候補タップで即装備する操作説明、選択枠、装備中枠、処理中表示も追加した。Development postflight 6/6 PASS。直接UPDATE拒否から新RPC装備、QUEST確定ACTIONまで実DB E2Eを通過した。
- 育成結果UX `IMPLEMENTED / LOCAL VERIFIED / UI RECHECK PENDING`: キャラ/装備のLv強化成功後に、強化前Lv→強化後Lvの結果ダイアログを共通表示する。実行前確認は追加しない。
- M3-3a `DB VERIFIED`: 装備LvのHP/ATK/DEF反映を確定仕様のLv1=10% / Lv50=60% / Lv100=100%曲線へ統一した。クライアント戦力表示、モック、QUESTサーバースナップショットを同式へ更新。Development postflight 5/5 PASS。装備突破の現行補正は固定ボーナスマスタ承認まで変更しない。
- 用語負債: 現行`EQUIP_LB_HAMMER`の表示名「限界突破ハンマー」は確定仕様名称ではないためOpen Betaリリース判定時に差し替える。現段階は暫定名称として維持する。
- M3-3b `IMPLEMENTED / DB VERIFIED / EDGE DEPLOYED / REAL DB E2E PASS`: 承認済み暫定案を差替可能な`skill_battle_master`へ実装。通常50件を有効、未確定専用20件を無効とし、QUESTスナップショットで装着枠・専用条件・+41%曲線を検証して実行データ化する。Edge/モックの攻撃・回復・BUFF/DEBUFF・状態異常を同じ決定論入力へ統一した。Development postflightは9/9 PASS。DevelopmentへEdge Functionを再デプロイし、正規の無料ガチャから装着した有効スキルがサーバースナップショットと確定ACTIONイベントへ反映される実DB E2Eを通過した。

## 前提と目的

本計画は本番リリース計画ではない。既存の開発環境から現在のリポジトリ構成へ安全に移行し、不足機能を実装・検証するための開発計画である。本番環境は作成・公開せず、開発環境とPreviewだけを対象にする。

- `supabase/migrations/` をスキーマ変更の正本にする。
- 既存の開発用データは、バックアップを取ったうえで移行・検証に使用する。
- 機能追加とスキーマ変更は継続する。ただし、変更はmigrationと受入条件を伴わせる。
- 本番公開の可否判断は、すべての開発フェーズが完了した後に別途行う。

## フェーズ1：開発環境の移行基盤

1. 既存開発環境のテーブル、RLS、RPC、マスタデータ、適用履歴をエクスポートして記録する。
2. 既存開発DBにはmigration履歴テーブルがなく、手作業構築の可能性があるため、現行DBを直接 `db push` で上書きしない。
3. 現リポジトリの `supabase/migrations/` と既存環境の差分を作成し、不足分は新規migrationで補う。必要に応じて、既存DBを基準にした初回ベースラインmigrationを別途作成する。
4. 開発環境へ段階的に適用し、各migrationの適用結果とロールバック方法を記録する。
5. `MockSupabaseClient` はローカル画面確認用に残し、実DB確認では開発用Supabaseを使用する。

完了条件: 既存開発データを失わず、開発用Supabaseでアプリが起動し、主要マスタと既存ユーザー状態を読み込める。

## フェーズ2：不足機能の仕様確定と実装

機能は以下の単位で、仕様書の受入条件、DB migration/RPC、画面、テストを同じ変更単位として実装する。

1. **初期化・進行**: 新規ユーザー初期化、プレイヤー名、ギフト、キャラクター・所持品の初期状態。
2. **経済とガチャ**: マスタ駆動の抽選、重複獲得、天井、通貨消費、プレゼント配送、ショップ購入。
3. **対戦コンテンツ**: PvP、GvG、レイドの対戦結果、回数消費、報酬、ランキング、日次・シーズン処理。
4. **ソーシャル機能**: ギルド権限、友達、チャット、BBS、投稿制限、通知。
5. **UI・アセット**: 仕様書に定義された未生成アセット、ローディング、モバイルレイアウト、画面導線。

各機能の着手前に「仕様済み・実装済み・実DB検証済み」を判定し、仕様と実装が異なる場合は仕様書を先に更新する。

完了条件: 対象機能ごとに、仕様書、実DBでの正常・異常ケース、画面導線が揃っている。

## フェーズ3：安全な実装への段階的移行

本番公開前の必須条件として進めるが、開発環境での機能実装を止めない。

1. ユーザー系テーブルの `FOR ALL USING (true)` を、本人・必要な公開情報・管理処理だけを許可するRLSへ置換する。
2. 経済・対戦・報酬・育成の直接 `insert` / `update` / `upsert` / `delete` を、所有者検証付きの原子的RPCへ移管する。
3. `SECURITY DEFINER` RPCで `auth.uid()` と対象ユーザー／ギルド権限を照合し、`search_path` を固定する。
4. テスト用通貨付与・管理用RPCは開発環境だけに限定し、本番候補環境には含めない。

完了条件: 他者ID、負数・過大な金額、重複送信、権限外操作が開発用Supabaseで拒否される。

## フェーズ4：品質と継続開発の基盤

1. lintを段階的に解消する。最初に `mockRpc.ts`、`GameContext.tsx`、`RankingTab.tsx` の型と副作用を整理する。
2. バトル、ステータス、報酬計算の単体テストを追加する。
3. 認可、残高不足、二重実行、日次境界、報酬受取、リセットのRPC統合テストを追加する。
4. Google Fontsへのビルド時依存をなくし、自己ホストまたはシステムフォントへ切り替える。
5. CIでlint、型検査、テスト、production buildを実行する。ただしデプロイは行わない。

完了条件: 開発・Previewで品質ゲートが安定して通り、既存開発環境と同等以上の機能確認ができる。

## 本番リリースは別ゲートとする

本番用Supabase・Vercel Productionの設定、実データ移行、公開は本計画の対象外である。フェーズ1〜4の完了後に、RLS監査、負荷確認、バックアップ・復旧訓練、運用担当確認を満たす別のリリース計画を承認する。

## 直近の着手順

1. 既存開発Supabaseのmigration historyとスキーマ差分を取得する。
2. 実DBで不足しているテーブル・RPCを新規migrationとして追加する。
3. 未実装またはスタブの初期化・経済・対戦処理を、仕様確認後に優先順で実装する。
4. 並行して、経済・対戦データからRLS/RPC保護を強化する。

## 2026-08-03時点の進捗

- 経済とガチャのうち、キャラクター・スキル・装備のサーバー抽選RPCを開発DBへ適用済み。
- キャッシュ、ダイヤ、ガチャチケット、無料回数、残高不足、重複、限界突破、上限変換、ピティ、認可拒否を実DBで検証済み。
- 残作業は、10連の正常系、ピティ交換、UI結合、RLS監査、migration baseline、既存Lint整理である。
- RLS監査結果は `specs/rls_audit.md` に記録した。広い既存ポリシーは機能単位で段階的に是正する。
- migration履歴未管理の開発DBについて、baseline手順を `specs/migration_baseline.md` に整理した。
- PostgreSQL Client Toolsの`pg_dump`で開発DBのschema-only baselineを取得し、`supabase/baseline_dev_schema.sql`として保存した。
- 所持データ4テーブルの所有者RLSと、ヘルパー／PvP／GvG／ギルドメンバー向け公開RPCを開発DBへ適用済み。
- 公開プロフィール、ランキング、フレンド、オンライン人数、初期化状態の取得もRPC化し、`users` の公開直接参照を段階的に削減した。
- `users` テーブルも所有者RLSへ移行し、本人以外の参照は公開プロフィール系RPCへ整理した。
- 本番DBとVercel Productionは引き続き変更しない。
## 2026-08-03追加進捗

- 開発DBで所有者RLSを5テーブルへ適用し、匿名クライアントのRLSスモークテストを追加・成功。
- `user_power_rankings` の実DBカラム（`total_power`）とRPC/クライアントの不整合を修正。ランキングRPCの認証済みスモークテストも成功。
- TypeScript検査、Next.jsビルド、ローカルHTTP 200確認を完了。本番リリースは未実施。
- 残タスク: Preview画面の実操作確認、既存Lintエラーの段階的解消、残存する広範RLSポリシーの機能単位ハードニング。
## 企画方針反映（2026-08-03）

- PvP・GvG・レイドをゲーム継続の中心コンテンツとする。
- 課金は収集補助（ガチャ）を主軸、時間短縮を副軸とする。
- シナリオ／ADV／アバターは初回リリース対象外とし、実装優先度から除外する。
- 以降のPreview受入確認と機能追加は、対人・協力バトル、育成経済、継続利用導線を優先する。
## 最終コンテンツ優先順位（2026-08-03）

GvGをメインコンテンツ、レイド・PvP・クエストをサブコンテンツとする。Preview受入と追加実装はこの順序で評価する。
## GvG確定仕様の反映（2026-08-05）

- 日次開催: 12:00 / 20:00 / 23:00開始、各30分。
- 月次シーズン: 毎月最終金曜・土曜・日曜は上位ギルド限定の特別戦。
- 報酬: 通常戦・特別戦・日次・月次を報酬マスタ定義で管理。
- 既存の「7日周期」前提の実装・仕様記述は、月次シーズン仕様へ統一する。
## PvP・レイド確定仕様の反映（2026-08-05）

- PvPは常時開催、日次ランキング常設、1週間タームの週次ランキング。
- PvPの日次・週次報酬は報酬マスタ定義。
- レイドは毎日ランダムな2拠点で発生し、各24時間開催。
- レイドランキングを実装し、ボスはボスマスタ、撃破・失敗報酬は報酬マスタで管理。
## 原資・ゲームサイクル確定事項（2026-08-05）

- クエストとGvGは共通の行動力（AP）を消費する。
- PvPとレイドはそれぞれ独自原資を持つ。
- GvGはエンドコンテンツだが常時開催ではないため、非開催時間はクエストによる放置育成・ガチャによる時短育成に充てる。
- PvP・レイドは任意参加。参加報酬で育成は加速するが、未参加でも通常の育成進行を可能にする。

## 公式GvGサーバー確定フロー（2026-08-06）

- 公式マッチの侵攻開始は `begin_gvg_attack` を必須とし、旧拠点制の直接開始を禁止する。
- 防衛側はマッチ確定時の `gvg_match_member_snapshots.defense_deck` を使用し、開始時点の所持データへ再読込しない。
- `resolve-battle` Edge Function がサーバーseedと保存済みスナップショットから結果・イベントを確定する。公式GvG以外のクライアント生成スナップショットは、確定結果として扱わない。
- `resolve_gvg_attack` はクライアントの勝敗・ダメージ引数を採用せず、確定済みリプレイ結果から共通HPへの反映量を得る。
- Edge Function 呼び出しに失敗した場合は未確定攻撃だけを取消し、APは開始時に確定済みのため返還しない。
- 残作業は、開発用Supabaseへの migration 適用、Edge Function のデプロイ、開催中・終了境界・同時解決の実DB統合テストである。
## ミッション・ログインボーナス・ガチャ・フレンド仕様反映（2026-08-05）

- ミッションはデイリー（毎日リセット・反復可）と通常（1回のみ）に分離し、内容と報酬をマスタ管理する。
- ログインボーナスは30回シートを繰り返す形式とする。
- ガチャはキャラクター・スキル・装備ごとにノーマル／スペシャルを持ち、価格・確率・排出・ピティをマスタ管理する。
- ノーマルは毎日10連無料・天井なし、スペシャルは天井あり。期間限定ガチャを追加可能にする。
- フレンドのリーダーキャラクターをヘルパーとして利用し、フレンドポイント経済は導入しない。

### Open Beta M7完了（2026-08-12）

- デイリー／通常ミッション、04:00 JST更新、未受取救済、原子的報酬受取、通常ミッション段階解放を実装・実DB検証済み。
- 暫定ミッション18件は安定ID・`is_provisional`で差し替え可能とし、内容と報酬のレビュー承認済み。
- ログインボーナス30回シート、同日冪等性、30→1ループ、プレゼント格納を実DB E2E確認済み。
- ミッション／プレゼント受取と育成操作へ共通連打防止を適用し、手動UI確認を完了。M7をCOMPLETEとする。

### Open Beta M8完了（2026-08-13）

- M8-1 `COMPLETE / DB VERIFIED`: テスト通貨、旧ガチャ、未検証課金／月額パス、運営RPCをconsumerから遮断し、`users`の直接UPDATEをプロフィール列だけに限定した。エナジードリンク消費も`auth.uid()`由来の原子的RPCへ置換した。Development postflightは8/8 PASS。
- M8-2a `COMPLETE / DB VERIFIED`: RLS未設定だった`user_daily_gacha_claims`と`user_gacha_pity_points`を所有者SELECT専用に変更し、正規ガチャRPCだけが更新する構成へ統一した。Development postflightは4/4 PASS。
- M8-2b `COMPLETE / DB VERIFIED`: 実DB棚卸しで検出した`user_items`／`user_skills`直接書込みと26本の旧client-authoritative mutation RPCを遮断。現行13 RPCは認可・固定`search_path`を維持し、装備売却は所有権とサーバー価格を検証する新RPCへ置換した。Development postflightは6/6 PASS。
- M8-3 `COMPLETE / REAL DB ADVERSE E2E PASS`: Critical 21テーブル、RLS、直接書込み、プロフィール列権限、`SECURITY DEFINER`、caller-ID allowlist、広範policyの最終ゲートは7/7 PASS。linked Developmentユーザーの異常系操作12件はすべて拒否または正規own-profile処理成立を確認した。
- M8を`COMPLETE`とする。BBSのauthenticated全体SELECTは仕様上の公開範囲として維持する。停止した旧PvP／GvG／Raid／Friend mutationはSHOULD／POST-BETA再開時にサーバー確定処理へ置換する。Production適用とservice-role／QA fixture分離はM10の環境ゲートで再確認する。
