# 仕様書と実装のギャップ一覧

更新日: 2026-08-03

## Open Beta M1進捗（2026-08-12）

- M1-2 `IMPLEMENTED / DB VERIFIED`: 新規開始と既存ログインの入口を分離し、匿名セッションは「はじめから」の明示操作後にだけ作成するよう変更した。
- `get_current_onboarding_state()` を追加し、匿名状態、プロフィール、チュートリアル、単一認証方式、既存認証ユーザー互換を1つのサーバー応答で判定する。
- `COMPLETE` で認証連携中のユーザーは既存互換扱いにせず、`complete_tutorial_authentication` 成功まで通常プレイ許可にしない。
- モックE2Eに加え、開発Supabaseで匿名状態RPCと未認証拒否を確認済み。
- M1-3 `IMPLEMENTED / DB VERIFIED`: 名前だけを受け取る原子的な初期化RPCへ移行し、任意ユーザーID・初期キャラクター・拠点・報酬のクライアント指定を廃止した。正規化ユーザー名の重複拒否、同一匿名ユーザーの再送冪等性、スターター重複なし、他者RLSを開発Supabaseで確認済み。
- M1-4 `IMPLEMENTED / MOCK VERIFIED`: 匿名UUIDを維持したメール・パスワード連携、確認メール待ちの再読み込み復帰、既存メール衝突時の自動マージ拒否を実装した。実メール往復は追加QAとして未確認。
- M1-5 `IMPLEMENTED / DB VERIFIED / UI RECHECK PENDING`: Manual Linking、Google Provider、Redirect URLを設定し、匿名UUIDを維持したGoogle identity連携、衝突拒否、ログアウト後の実Google再ログインをDevelopment DBで確認した。OAuth後の直接マイページ復帰は補正済みで再確認待ち。
- M1-6 `IMPLEMENTED / RPC DB VERIFIED`: 認証完了RPCの初回・再送とオンボーディング状態RPCの双方で、非匿名、対応identityが厳密に1方式、記録方式との一致を継続検査するよう強化した。不整合アカウントは再訪時にゲーム画面をブロックし、ログアウト導線を表示する。RPC定義・権限は実DB確認済み、provider異常系はモックE2E確認済み。
- M1-7／M1-8 `DB VERIFIED / UI RECHECK PENDING`: Development DBでpreflight／postflight、未認証拒否、匿名初期化、冪等性、正規化名重複、他者RLS、実Google provider往復と再ログインを確認した。直接マイページ復帰の再確認、実メール往復、ゲーム独自監査ログは追加QAとして継続する。

## Open Beta M2進捗（2026-08-12）

- M2-1 `IMPLEMENTED / DB NOT VERIFIED`: 固定だった通常派遣の時短料金を、確定仕様どおりCASHは残り1分100・JST日次3回、ダイヤは残り1時間10・無制限としてRPC側で計算するよう修正した。クライアントは料金とCASH残回数を表示し、モックで料金、二重実行拒否、日次上限、上限後のダイヤ利用を確認済み。
- M2-1のDevelopment DB構造・関数権限postflightは全PASS。実画面の料金・消費確認待ち。
- M2-2 `IMPLEMENTED / DB VERIFIED / UI RECHECK PENDING`: クエスト開始時にサーバー側でAP回復確定とマスタ由来AP消費を同一トランザクション化し、確定残APをクライアントへ返す。Development DB postflightは全PASS、モックでマスタ由来消費と返却値を確認済み。
- M2-3 `IMPLEMENTED / DB VERIFIED / AUTOMATED E2E PASS / MANUAL UI PASS`: 通常派遣のNPC戦をOpen Beta MUSTとし、全21公開クエストを100%遭遇へ変更。ブラウザが `user_patrols.battle_result` を直接更新する経路を除去し、所有済み編成とNPCマスタから生成したサーバースナップショットをEdge Functionで決着させる。Development実DBでチュートリアル勝利と通常派遣敗北の両経路、未決着報酬拒否、決着後報酬受取を確認し、実画面の挙動も確認済み。既存バトルUI・演出は確定結果の表示層として継続利用する。装備・装着スキルを含む完全な正規化、およびサーバーイベント列と画面演出の完全同期はM2-4として残る。
- M2-4a `IMPLEMENTED / DB VERIFIED`: 装備172件をクライアント定数から再生成可能なDB戦闘マスタへ移し、派遣リプレイの装備ステータスをサーバー正規値化した。装着スキル参照と+41%曲線も記録するが、現スキルマスタに個別対象・クールダウンがなく、専用スキル20件が正式設定前なので実行効果は未確定ブロッカーとして分離した。Development postflightは9/9 PASS。
- M2-4b `IMPLEMENTED / AUTOMATED E2E PASS / MANUAL UI RECHECK PENDING`: QUESTでは旧クライアントAI計算を止め、サーバーの正規編成と確定イベント列だけを既存バトル演出へ反映する。再生カーソルをクライアント保持し、サーバー結果と画面ログのダメージ一致、勝利後のチュートリアル遷移をDevelopmentブラウザで確認済み。残る確認は実端末での演出テンポ・視認性。
- 共通UX `IMPLEMENTED / UI RECHECK PENDING`: ダイアログ表示待ち・閉じる待ちをフリーズと誤認させないため、共通ボタンのsingle-flight化、即時spinner、確認ダイアログの先行dismiss、全画面処理中spinner、ガチャ操作群の一括disableを追加した。
- 共通連打防止 `IMPLEMENTED / LOCAL VERIFIED / UI RECHECK PENDING`: Reactのloading再描画前に入る同一フレームの連打を同期refで遮断する共通action lockを追加。育成系14操作とミッション／プレゼント受取へ適用し、結果ダイアログの描画タスク後まで解除しない。ミッションボタンはPromiseを共通ボタンへ返して処理中状態を維持する。
- 認証復帰UX `IMPLEMENTED / LOCAL VERIFIED / UI RECHECK PENDING`: Supabase Authがタブのhidden→visible復帰時に同一セッションへ`SIGNED_IN`を再通知する挙動を、新規ログインとして処理して全画面spinner・オンボーディングRPC・bootstrapを再実行していた。認証イベントを分岐し、同一ユーザーの`SIGNED_IN`と`TOKEN_REFRESHED`はセッション値だけ更新、初回・別ユーザー・`USER_UPDATED`だけ再検証するよう修正した。分岐テストと型検査はPASS。
- M3-1 `AUDITED`: 装備装着の非原子的な直接更新、旧一括RPCの任意ユーザーID、7枠部位マッピング不一致を最優先ギャップとして確認した。育成RPCの呼出側料金/user ID信用と、アカウント単位スキルを複数キャラへ装着できない現データモデルは後続へ分離する。
- M3-2a `IMPLEMENTED / LOCAL VERIFIED / DB APPLY PENDING`: 装備loadoutを所有者・部位・専用条件検証付きの原子的RPCへ移し、authenticatedの直接UPDATEと危険な旧RPCを閉じた。UIの武器2/アクセ2配置、部位候補、単体装着時の非同期state競合も修正した。
- M3-2a `DB VERIFIED`: Development postflight 7/7 PASS。
- M3-2b1 `DB VERIFIED`: 覚醒費用・上限・素材をDBマスタで確定し、他者IDとクライアント料金指定を排除した。Development postflight 6/6 PASS。
- M3-2b2 `DB VERIFIED / UI RECHECK PENDING`: Open Beta暫定値として、キャラLvは1素材/100 CASH、装備Lvは1素材/50 CASH、装備/スキル突破は次の+値×1,000 CASH・素材1個をマスタ投入した。4処理を`auth.uid()`・所有権・DB料金/上限・原子的消費のRPCへ統一し、旧caller-authority RPCを拒否した。Development postflight 8/8 PASS。暫定値はOpen Betaリリース判断時に最終ジャッジする。
- M3-2b3: キャラLv操作の誤引数を修正し、装備・スキル強化の対象選択とLv/突破操作UIを追加。Development実画面の再確認待ち。
- M3-2c `IMPLEMENTED / DB VERIFIED / REAL DB E2E PASS / UI RECHECK PENDING`: スキル個別装備のReact state競合と、一括推奨が存在しない引数契約の旧RPCを呼んでエラーを捨てる不具合を修正。所有者・覚醒解放枠・有効スキル・専用条件をDBで検証する原子的な個別/解除/一括RPCへ置換し、直接UPDATEとcaller-supplied user IDの旧RPCを閉じる。UIへ操作説明、選択中枠、装備中枠、処理中表示を追加した。Development postflight 6/6 PASS。直接UPDATE拒否、新RPCでの装備、QUESTスナップショット、1ラウンド目のスキルACTIONを実DB E2Eで確認した。
- 育成結果UX `IMPLEMENTED / LOCAL VERIFIED / UI RECHECK PENDING`: キャラクターと装備のLv強化成功後に、強化前Lv→強化後Lvを示す結果ダイアログを表示する。実行前の確認ダイアログは追加しない。
- M3-3a `DB VERIFIED`: 装備Lvの確定成長曲線（Lv1=10%、Lv50=60%、Lv100=100%）をクライアント・モック・QUESTサーバースナップショットへ実装。Development postflight 5/5 PASS。装備突破の固定ボーナスマスタは未確定のため現補正を維持する。
- `EQUIP_LB_HAMMER`の表示名「限界突破ハンマー」は暫定。Open Betaリリース判定時の用語差し替え対象。
- M3-3b `IMPLEMENTED / DB VERIFIED / EDGE DEPLOYED / REAL DB E2E PASS`: 差替可能な`skill_battle_master`、通常50件の暫定実行定義、専用20件の無効化、装着枠・専用条件・+値を検証するQUESTスナップショット結合を追加。Edgeとモックで攻撃・回復・BUFF/DEBUFF・状態異常を決定論的に処理する。正式値は同一`skill_id`のUPSERTで差し替え可能。Development postflightは9/9 PASS。DevelopmentへEdge Functionを再デプロイし、正規の無料ガチャで取得・装着した`SKILL_028`がサーバースナップショット（ATTACK / ENEMY_SINGLE / CD4）と1ラウンド目のACTIONイベントへ反映される実DB E2Eを確認した。

## Open Beta M4進捗（2026-08-12）

- M4 `IMPLEMENTED / DB VERIFIED / REAL DB E2E PASS`: ガチャ価格と無料10連の日次判定をDB正規値へ統一し、無料枠をノーマル限定にした。Development postflightは7/7 PASS。
- キャラクターガチャは差し替え可能な暫定60体（SSR 10／SR 20／R 20／N 10）と、ノーマル・スペシャルの正規プールをDBマスタ化した。Development postflightは7/7 PASS、実DBの無料キャラクターガチャE2EもPASS。
- 暫定キャラクター構成と排出重みは、正式マスタ決定時に同一IDのマスタ置換で差し替える。

## Open Beta M5進捗（2026-08-12）

- M5 `IMPLEMENTED / DB VERIFIED / MULTI-USER E2E PASS / MANUAL UI RECHECK PENDING`: ギルド作成・検索・加入申請・取消・承認／拒否・脱退・解散を所有権検証付きRPCへ統一し、直接書込みと危険な旧RPCを閉じた。Development postflightは10/10 PASS。
- 役職を`MASTER`／`SUB_MASTER`／`MEMBER`へ正規化し、権限移譲・役職変更・追放を原子的RPCへ統一した。Development postflightは7/7 PASS。
- 2ユーザーのDevelopment実DB E2Eで、作成、検索、申請、非権限者の承認拒否、承認、SUB_MASTER昇格、直接役職更新拒否、脱退、解散を確認した。
- UIへMASTER譲渡導線と脱退確認ダイアログを追加。最終の実画面再確認のみ継続する。ギルドチャットはM6で扱う。

## Open Beta M6進捗（2026-08-12）

- M6-1 ギルドチャット `IMPLEMENTED / DB VERIFIED / MULTI-USER REALTIME E2E PASS / MANUAL UI RECHECK PENDING`: 既存`board_posts`とチャットUIを維持し、ギルド3秒／全体10秒のサーバー側クールダウン、DB既読位置、未読件数、タブ復帰・Realtime再接続時の再取得を追加した。
- `board_posts`をauthenticatedのスコープ済みSELECT専用とし、anonアクセス、直接INSERT／UPDATE／DELETE、未使用の旧`user_chats`経路を閉じた。Development postflightは9/9 PASS。
- Developmentの2ユーザー実DB E2Eで、非メンバー閲覧拒否、加入後取得、未読加算、既読化、クールダウン、Realtime即時受信、直接INSERT拒否、ギルド解散を確認した。
- コミュニティ入口と全体／ギルドタブに最低限の未読件数を表示する。高度な通知UIはOpen Beta後回しとする。
- M6-2 BBS `IMPLEMENTED / DB VERIFIED / MULTI-USER REALTIME E2E PASS / MANUAL UI RECHECK PENDING`: スレッド単位のDB既読位置と未読件数、カードのNEW表示、コミュニティ未読合算、タブ復帰・Realtime再接続時の一覧／返信再取得を追加した。RPC応答とRealtimeの順序による返信二重表示も防止した。
- BBSテーブルをauthenticatedのSELECT専用とし、anon閲覧と直接INSERT／UPDATE／DELETEを閉じた。Development postflightは9/9 PASS。
- Developmentの2ユーザー実DB E2Eで、スレッド作成・取得、未読加算、既読化、Realtime返信、切断中返信の再取得、直接書込み拒否、未認証閲覧拒否を確認した。
- M6-3 DM `IMPLEMENTED / DB VERIFIED / MULTI-USER REALTIME E2E PASS / MANUAL UI RECHECK PENDING`: 送信者別未読件数、DMタブとコミュニティ入口の未読合算、選択外の未読相手導線、タブ復帰・Realtime再接続時の会話再取得を追加した。閉じた会話の自動既読と、RPC応答／Realtime順序による二重表示を防止した。
- `direct_messages`を参加者だけが読めるauthenticated SELECT専用とし、旧ポリシーに残っていた直接INSERT経路、anonアクセス、直接UPDATE／DELETEを閉じた。Development postflightは9/9 PASS。
- Developmentの3ユーザー実DB E2Eで、参加者取得、第三者閲覧拒否、送信者別未読、受信者限定既読化、Realtime即時受信、切断中DMの再取得、直接INSERT拒否、未認証閲覧拒否を確認した。
- M6 Social Minimumはギルドチャット、BBS、DMの全3系統で送信・取得・Realtime・再接続・最低限の未読を実DB確認済み。高度な通知UIのみ後回しとする。

## Open Beta M7進捗（2026-08-12）

- M7-1 ログインボーナス `COMPLETE / DB VERIFIED / REAL DB E2E PASS / MANUAL UI PASS`: 30回シート、JST日次判定、累計ログイン数、30→1ループ、プレゼントBOX格納を原子的RPCへ統一した。UIが期待する返却形式へ揃え、初回同時実行をユーザー単位で直列化した。
- `user_login_bonuses`と`presents`を所有者SELECT専用とし、クライアントからの状態・報酬捏造を閉じた。Development postflightは10/10 PASS。
- Development実DB E2Eで、初回取得、同日並行再送、プレゼント重複なし、他者RLS、直接改ざん拒否、30回目後の新シート1回目、累計31回、ループ後再送冪等性を確認した。
- M7-2a ミッション基盤 `IMPLEMENTED / DB VERIFIED`: デイリー／通常の正規区分、04:00 JST更新、デイリー未受取の24時間プレゼント救済、通常ミッションの受取後段階解放、所有者限定取得、原子的な個別／一括受取を実装した。Development postflightは9/9 PASS、内部進捗dispatch補正は5/5 PASS。
- クライアントが任意のユーザー・トリガー・進捗量を指定できた旧RPC、直接マスタ／進捗更新、クライアント側の日次救済生成を閉じた。サーバー結果確定RPCだけが内部イベント評価を呼ぶ構成へ移行する。
- M7-2b 暫定ミッション `COMPLETE / DB VERIFIED / REAL DB E2E PASS / MANUAL UI PASS`: レビュー承認済みのデイリー4件・通常14件を安定IDで投入し、旧暫定行を無効化した。Development postflightは12/12 PASS。
- 実DB E2Eで初期ルート10件、ログイン自動達成、直接進捗改ざん拒否、他者RLS、原子的受取と二重受取拒否、経験の書が装備ではなく所持アイテムへ格納されることを確認した。
- M7 `COMPLETE`: ログインボーナス、ミッション、報酬受取、04:00 JST更新、二重取得防止、30回ループ、暫定マスタ、実DB E2E、手動UI確認を完了。共通連打防止により結果ダイアログ表示前の重複操作も遮断した。

## Open Beta M8進捗（2026-08-13）

- M8 `COMPLETE / DB VERIFIED / REAL DB ADVERSE E2E PASS`: users、inventory、gacha、reward、growth、guild、chat、missionを横断監査し、Critical 21テーブルすべてでRLS有効、authenticatedのテーブル単位直接書込み0件、許可外の広範RLS 0件、固定`search_path`なしの公開`SECURITY DEFINER` 0件をDevelopment DBで確認した。
- 一般ユーザーから、テスト通貨付与、未検証課金／月額パス、旧ガチャ決済、運営リセット、クライアント指定XP・報酬・勝敗・消費量を信用する旧RPCを遮断した。26本の旧mutation RPCはanon/authenticated実行不可、24本の開発／運営／課金RPCはservice_role限定となった。
- `users`は承認済みプロフィール列だけをUPDATE可能とし、通貨、AP、Lv/XP、ギルド所属、ログイン／報酬状態をRPC専用にした。`user_items`、`user_skills`、ガチャ無料回数／ピティ、課金履歴、月額パス状態も所有者SELECT専用とした。
- 装備売却を`auth.uid()`、所有、装備中、重複、最大100件、サーバー固定売価500 CASHで検証する`sell_owned_equipment(uuid[])`へ置換した。旧`sell_gear_bulk(uuid,jsonb)`は一般ユーザーから遮断した。
- 最終Security Gateは7/7 PASS。linked Developmentユーザーによる実DB異常系E2Eは、直接通貨更新、所持品／スキル／課金状態捏造、テスト通貨、任意XP、旧PvP勝敗、他者ガチャ、他者ギフトコード、装備売却重複を含む12/12 PASS。各試行は例外サブトランザクションで巻き戻し、テスト変更は残していない。
- BBSスレッド／投稿のauthenticated全体SELECTは確定BBS仕様に必要な公開範囲として許可する。caller-supplied IDを持つ現行13関数は、`auth.uid()`一致検査済みまたは公開バトル情報の対象指定としてallowlist化した。
- 旧クライアント権威のPvP／GvG／Raid／Friend mutationは安全側で停止した。これらSHOULD／POST-BETA機能を再開する場合は、サーバー確定リプレイ／報酬と所有権検証を備えた正規RPCへ置換する。Development QA fixtureは内部allowlistを維持して`search_path`を固定し、Production候補へ持ち込まない。

仕様書に記載された機能を、現行の`src/`・Supabase migration・Preview確認結果と照合した結果です。

## 優先度A（機能追加前に仕様確定が必要）

企画方針として、PvP・GvG・レイドを継続の中心、ガチャを課金の主軸、時間短縮を副軸とする。シナリオ／ADV／アバターは初回リリース対象外へ変更した。

| 項目 | 仕様上の要求 | 現状 | 次アクション |
|---|---|---|---|
| Stripe決済 | Stripe Checkout / Webhook、冪等な課金処理 | クライアントから開発用RPC`process_stripe_shop_purchase`を呼ぶ実装はあるが、`src/app/api`のCheckout/Webhookエンドポイントがない | Stripe API・Webhook境界を設計し、Preview用テストモードで実装・検証 |
| シナリオ/ADV | `flow_nodes`形式の会話フロー、選択肢・分岐・セーブ復帰 | 現行`src`にシナリオエンジンと`flow_nodes`実行処理が見当たらない | 初回リリース対象外。別計画へ保留 |
| DM/ギルドチャット | 双方向Realtime、受信表示、未読・再接続 | BBSはRealtime購読済み。DM送信はあるが、DM取得・Realtime購読・未読管理が不足 | `direct_messages`/`user_chats`の所有者・参加者RLS、購読、未読状態を実装 |

## 優先度B（仕様上は存在するが部分実装・意図的停止）

| 項目 | 現状 | 次アクション |
|---|---|---|
| アバター作成UI | データ構造・描画・同期は保持されているが、仕様書どおり通常導線からオミット | 初回リリース対象外。再開時に別計画を作成 |
| 専用装備画像 | マスタ枠は存在するが、対象キャラクター画像が未生成の装備が7件 | 画像生成・配置・Preview表示確認 |
| 初期アセット数 | 仕様書の初期実装数とマスタ実数に差分がないか要棚卸し | マスター件数を自動集計し、初期実装/アップデート在庫を確定 |
| 決済・購入履歴 | RPCと`payment_transactions`はあるが、実決済の外部連携は未検証 | Stripe Test modeでWebhook冪等性・返金/失敗を検証 |

## 優先度C（品質・運用）

- 既存Lintエラーの段階的解消（全体Lintは未通過）。
- 残存する広範RLSポリシー（主にギルド・PvP/GvG/レイド・チャット）の機能単位ハードニング。
- Playwright等によるPreview E2E導入と、主要導線の実機自動検証。
- 本番前の負荷試験、バックアップ復旧訓練、運用監視設計。

## 実装済みとして扱える主要領域

キャラクター/スキル/装備ガチャ、通貨・チケット・無料10連、ピティ・交換、公開プロフィール/ランキング、PvP/GvG/レイドの主要RPC、所有者RLS、BBS Realtime、Preview配信・ビルド・型検査は開発環境で検証済みです。
Priority correction: GvG is the primary retention loop. Raid, PvP, and quests are supporting loops, followed by collection, growth, and social rewards.
## GvG仕様確定に伴う実装ギャップ

- 現行UIの開催枠（12:00 / 20:00 / 23:00、各30分）は確定仕様と一致。
- `getGvgPhase()`の月末判定、月次シーズンの上位ギルド特別戦参加資格、報酬マスタ参照による自動集計・配布は実装確認・修正が必要。
- 旧7日周期ロジックを残したままにせず、月次シーズン基準へ置換する。
## PvP・レイド仕様確定に伴う実装ギャップ

- PvPの常時開催と日次ランキングは概ね存在するが、週次タームの開始・終了・報酬マスタ集計を実機確認する必要がある。
- レイドは現行実装が単一ボス／単一拠点前提の箇所を含むため、毎日2拠点同時発生へ拡張する必要がある。
- レイドボスをボスマスタから選定し、撃破・失敗の双方を報酬マスタで配布する処理へ統一する必要がある。
- レイドランキングの個人・ギルド集計と24時間終了処理を、2拠点それぞれで独立して扱う必要がある。
## 原資・ゲームサイクル仕様に関する確認事項

- クエストとGvGのAP共通消費が、両方の実装経路で同一残高・同一減算ルールになっているか確認する。
- PvP専用原資、レイド専用原資がAPと混在していないか確認する。
- GvG非開催時間にクエスト放置育成とガチャ時短が成立する導線をPreviewで確認する。
- PvP・レイドの報酬が育成を加速する一方、未参加ユーザーの通常進行を阻害しないか経済バランスを検証する。
## ミッション・ログインボーナス・ガチャ・フレンドの実装ギャップ

- ミッションのデイリー／通常区分と、報酬マスタ参照・反復可否を確認する。
- 現行のログインボーナスは7日サイクル前提の箇所があるため、30回シートへ変更が必要。
- ガチャの現行RPCは通貨・チケット・無料10連・スペシャルピティを一部実装済み。ノーマル／スペシャルの価格、天井有無、各カテゴリのマスタ完全参照、期間限定ガチャ枠を再確認する。
- フレンドリーダーのバトル参加は実装済みのため、ヘルパー表示・重複利用制限・フレンドポイント非導入をPreviewで確認する。

## 確定仕様反映の実装差分・受入条件（2026-08-05）

`spec_battle_system.md`および`specification_reconciliation.md`を優先仕様とし、以下を実装の受入条件とする。既存Previewの挙動・表示が異なる場合は、既存実装ではなく本節を優先して置換する。

### 第1縦切り：GvG

| 対象 | 現行差分 | 受入条件 |
| --- | --- | --- |
| GvG画面 | 拠点支配・拠点別ポイント・手動ラウンド選択が残る | 対戦相手、事前マッチング状態、30分残り時間、両ギルドの現在フェーズHP、陥落回数、削り割合、自身の実与ダメージ貢献を表示する。旧拠点支配UIをGvG勝敗情報として表示しない。 |
| GvG進行 | `gvgActiveRound`とクライアントタイマーに依存 | サーバー時刻とマッチング確定済み対戦レコードを基準に、11:50／19:50／22:50確定、12:00／20:00／23:00開始、30分終了を判定する。 |
| 共通HP | 1回削り切り・拠点ポイント系の実装が残る | 2フェーズ制とし、各フェーズHPはランク補正後の基本HP。第1フェーズHP0で`1/2`へ移行・全回復し、第2フェーズHP0で勝利とする。更新・移行は原子的に行う。 |
| 個別戦・貢献 | 勝敗と共通HP反映が未分離 | 敗北時は実与ダメージ100%、勝利時は実与ダメージ150%を共通HPへ反映する。個人貢献は常に勝利ボーナス前の実与ダメージで記録・表示する。 |
| 防衛枠 | 登録済みデッキ中心の抽選 | 所属メンバー全員を1人1枠で均等抽選し、未登録枠はギルド総合力÷防衛対象人数を基準とする標準NPCで補完する。同一攻撃ユーザーは直前の防衛枠を連続抽選しない。 |
| 開催ロック | 開催中のギルド操作を制御していない | 開催中は加入、脱退、追放、解散、役職変更、防衛デッキ変更を完全ロックする。終了時刻までにサーバー受理した攻撃のみ有効とする。 |
| AP | GvG侵攻コストは定数に存在するが、共通APの仕様がUIへ未反映 | クエストと同じユーザー保有APを使い、侵攻1回で20APを消費する。開催中の個人挑戦回数上限は設けない。 |

### 共通バトル基盤の後続受入条件

| 現行の旧実装 | 置換後の受入条件 |
| --- | --- |
| `OFFENSIVE`／`DEFENSIVE`／`HEALING`／`BALANCED`／`AP_CONSERVING`／`TACTICAL`の6作戦、戦闘内AP | 攻撃優先、回復優先、スキル優先、バランス、弱点集中の5作戦。戦闘内APは廃止し、スキルは個別クールダウンで管理する。 |
| 通常防御、SPDタイムライン、`ap_cost`を前提とするスキル表示・AI | 通常攻撃のみを常時可能な基本行動とする。各ラウンドで生存者全員が1回行動し、SPDは順番だけを決める。 |
| 装備の`random_options`と再抽選 | 装備ID固定の効果・限界突破ボーナスへ移行し、取得時の抽選・再抽選は行わない。既存列・RPC・UIは移行後に削除する。 |
| タイトル直後の認証画面 | ユーザー名入力を含むチュートリアル完了後に、Google OAuthまたはメール・パスワードのいずれか1方式で認証させる。認証方式の併用は不可。 |
