# TRIBE NEON --- Open Beta Release Plan

更新日: 2026-08-12

## 1. 目的

Open Beta開始を目標として、残り実装をリリース優先順位に基づいて進める。

正本: - `specs/` 配下の確定仕様書 -
`specs/implementation_gap_analysis.md` -
`specs/implementation_plan.md` - TRIBE NEON Art Bible

既存実装と確定仕様が矛盾する場合は確定仕様を優先する。不明点を推測で新規確定せず、必要なら差分を報告する。

## 2. 最重要ルール

残り確保可能工数の目安は **60〜70時間**。

当初の8/17は目標日であり、品質を下げて守る期限ではない。Open
Beta最低品質に到達しない場合は公開を延期する。

P0 /
MUSTの完成を阻害する場合、P1以下の新規実装、不要な大規模リファクタリング、全体Lint解消、低優先画面のUI改善、高度な演出、将来用機能、高度な自動テスト基盤整備には着手しない。

## 3. Open Beta主要E2E

`新規流入 → チュートリアル → ユーザー名 → 認証 → 初期化 → ホーム → 無料ガチャ → キャラ/スキル/装備取得 → 編成 → 育成 → クエスト → バトル → 報酬 → ミッション → ギルド → コミュニケーション → 再ログイン/翌日再訪`

この一本を成立させることを最優先する。

## 4. 優先度

### MUST

1.  Auth / Tutorial / User Initialization
2.  Quest / Battle / AP
3.  Inventory / Formation / Growth
4.  Normal Gacha / Daily Free 10
5.  Guild
6.  Social Minimum（Guild Chat / BBS / DM）
7.  Mission / Login Bonus
8.  Critical RLS / RPC
9.  主要画面UI / UX / 演出
10. Production Environment
11. Open Beta E2E / 実機QA

### SHOULD

12. Friend Invitation（仮実装済みの完成・検証）
13. Friend / Helper
14. PvP
15. Raid

### POST-BETA

-   GvG本番稼働
-   Stripe / Payment
-   Special Gacha
-   Starter Pack / VIP / 課金商品
-   GvG専用演出
-   全画面完全デザイン統一
-   Lint全面解消
-   高度なE2E基盤
-   大規模リファクタリング
-   シナリオ / ADV / アバター

GvG・課金系はOpen
Beta開始後の最優先トラックとする。当初計画では8/24開始を目標とするが、Open
Beta開始日が延期された場合は再計画する。

## 5. MUST完了条件

### M1. Auth / Tutorial / Initialization

初回アクセス、チュートリアル、ユーザー名、確定仕様に沿った認証、user作成、初期所持/通貨、ホーム遷移、再ログインを完成させる。二重初期化、中断復帰、認証失敗、`auth.uid()`整合、他者操作を確認。

Done: `新規ブラウザ → チュートリアル → 名前 → 認証 → 初期化 → ホーム`
が実DBで通る。

### M2. Quest / Battle / AP

クエスト、放置育成、基本バトル、AP消費/回復、報酬、進捗保存を完成させる。クエストとGvGは共通AP。PvPとレイドは専用原資。

Done: `クエスト → AP消費 → バトル → 報酬 → 育成 → 次クエスト` が成立。

### M3. Inventory / Formation / Growth

キャラクター/スキル/装備所持、編成、強化、限界突破、戦力計算、バトル反映。

Done: `取得 → 所持 → 強化 → 編成 → 戦力上昇 → バトル反映` が成立。

### M4. Normal Gacha / Daily Free 10

キャラ/スキル/装備、毎日無料10連、日次リセット、排出、重複、限界突破、上限処理、結果表示、所持反映。ノーマルは毎日10連無料・天井なし。マスタ参照を維持。

Done: `無料10連 → 演出 → 結果 → 所持 → 育成` が成立。

### M5. Guild

作成、検索、加入/申請/承認、脱退、メンバー、団長/副団長、基本権限。

Done: 複数ユーザーで
`作成 → 検索 → 加入 → メンバー確認 → コミュニケーション` が成立。

### M6. Social Minimum

優先順位はギルドチャット → BBS →
DM。送信、取得、Realtime、再接続、最低限の未読を確認。高度な通知UIは後回し可。

### M7. Mission / Login Bonus

デイリー/通常ミッション、達成、報酬、リセット。ログインボーナスは30回シート、日次取得、二重取得防止、30回終了後ループ。翌日再訪の動機を成立させる。

### M8. Critical RLS / RPC

各機能と並行して実施。users、inventory、gacha、reward、growth、guild、chat、missionを優先。他者ID、異常値、二重送信/報酬、未認証、権限外操作を拒否。経済・報酬系をクライアント直接更新にしない。

### M9. UI / UX / Presentation

Art Bibleと確定仕様を正とする。優先順位は初回導線 → ホーム → ガチャ →
育成 → クエスト → バトル → リザルト → ギルド → ミッション/ログボ →
ソーシャル。

情報優先順位、CTA、可読性、タップ領域、responsive、safe-area、loading/empty/error/disabled、成功/失敗フィードバック、数値変化、navigationを確認。主要画面は「操作できる」だけではDoneとしない。

演出はArt
Bible上のTier分類を参照し、Tier自体の仕様変更はしない。ガチャ、バトル、育成、報酬の主要フィードバックを優先し、操作テンポとモバイル性能を優先する。

### M10. Production Environment

Production Supabase、migration、Vercel
Production、環境変数、ドメイン/DNS/SSL、OAuth本番設定、Analytics、広告CV計測、エラー監視、DBバックアップ、OGP/favicon/robots.txt。開発DBをそのままProductionにしない。

### M11. Open Beta E2E / 実機QA

Production候補環境で主要E2Eを確認。最低対象はiPhone Safari、Android
Chrome、PC
Chrome。レイアウト、safe-area、スクロール、モーダル、キーボード、戻る、reload、通信失敗、session切れ、データ整合性を重点確認。

## 6. SHOULD

### S1. Friend Invitation

**仮実装済み。新規実装として扱わない。**
現行コード/DB/RPC/UIを調査し不足のみ実装。invite
code/URL、コピー、X共有、inviter/invitee、成立条件、報酬、重複/自己招待防止、招待人数、RLS/RPCを確認。

Done: `招待URL → 別ユーザー登録 → 条件達成 → 招待成立 → 報酬`
がE2Eで通る。

### S2. Friend / Helper

フレンド申請/承認/削除/一覧、リーダーキャラクター、ヘルパー利用。フレンドポイント経済は導入しない。

### S3. PvP

確定仕様に沿って常時開催、専用原資、日次/週次ランキング、報酬等を確認。MUSTを阻害する場合は延期。

### S4. Raid

確定仕様に沿って毎日2拠点、各24時間、ボスマスタ、専用原資、個人/ギルドランキング、成功/失敗報酬等を確認。旧単一ボス/単一拠点前提を残さない。MUSTを阻害する場合は延期。

## 7. Sound方針

サウンドファイル制作はCodex担当外。ユーザー側で別途用意する。

Codex担当: - Audio管理基盤 - BGM / SE再生 - 音量 / ON-OFF / 設定保存 -
autoplay制限 / iOS Safari対応 - BGM切替 / SE多重再生制御 -
音源未設定時の安全なfallback

サウンド定義を一元管理し、音源受領後はファイル配置とmapping更新だけで反映可能にする。実ファイル未提供でもゲームが正常動作すること。

## 8. Image Asset方針

不足画像生成はCodexから切り離し、ChatGPTブラウザ版/アプリ版で別ラインで行う。

Codexは画像生成を行わず、配置、import/URL、responsive、aspect
ratio/object-fit、transparency、fallback/loading、差し替えのみ担当。

不足画像があっても実装を停止せずplaceholderで進め、以下を一覧化する: -
asset名 - 使用画面 / 用途 - 推奨サイズ / aspect ratio - 透過要否 -
優先度 - 現在のplaceholder - 関連コンポーネント

## 9. 工数管理

総残工数目安は60〜70時間。各タスク着手前にMUSTか、SHOULDか、Open
Beta後へ送れるか、主要E2Eを改善するかを判断する。

MUSTでない作業が想定以上に長引く場合は中断してMUSTへ戻る。既存コードを活用し、「より綺麗な設計」だけを理由とした全面書き直しは禁止。

## 10. GO / NO-GO

公開候補日の1〜2日前にRelease Candidate判定。当初計画では8/15〜8/16。

GO: - 主要E2EがProduction候補環境・スマホ実機で通る - データ消失なし -
重大なRLS/認可問題なし - 報酬二重取得/通貨不整合なし - Production安定 -
P0画面が公開可能なUI品質

NO-GO: - 新規登録/初期化が不安定 - 所持データ消失 - ガチャ/通貨不整合 -
育成がバトルへ反映されない - クエスト進行不能 - 重大な報酬二重取得 -
ギルド基本機能不成立 - 重大なRLS/認可問題 - Production DB/deploy不安定 -
スマホ主要導線が操作不能 - データ破壊につながるCritical bug

NO-GOなら日付に固執せず延期する。

## 11. Open Beta後

1.  Open Beta Critical Bug
2.  GvG
3.  Payment
4.  Special Gacha
5.  Starter Pack
6.  VIP
7.  GvG Monetization
8.  PvP / Raid未完成部分
9.  UI / 演出改善
10. その他品質改善

重大障害がある場合は次マイルストーンより障害修正を優先。

## 12. 進捗管理

各作業完了時に以下を更新: - `specs/implementation_gap_analysis.md` -
`specs/implementation_plan.md`

状態:
`NOT STARTED / STUB-MOCK / IMPLEMENTING / IMPLEMENTED / DB VERIFIED / PREVIEW VERIFIED / PRODUCTION VERIFIED / BLOCKED / POSTPONED`

`IMPLEMENTED` と `VERIFIED` を混同しない。

## 13. Codex作業報告

各実装ブロック完了時に簡潔に報告: - Completed - Verification - DB / RLS
Impact - UI Impact - Remaining - Blockers - Asset Requests - Sound
Requests - Next

## 14. Codex実行順

1.  Auth / Tutorial / Initialization
2.  Quest / Battle / AP
3.  Inventory / Formation / Growth
4.  Normal Gacha / Daily Free 10
5.  Guild
6.  Social Minimum
7.  Mission / Login Bonus
8.  Critical Security
9.  UI-P0 / Presentation
10. Production Environment
11. Open Beta E2E / 実機QA
12. Friend Invitation
13. Friend / Helper
14. PvP
15. Raid

RLS/RPC、最低限のUI、asset不足確認は各機能と並行する。

## 15. 最終原則

Open Betaの成功条件は日付ではなく、ユーザーが
**初めてアクセスし、ゲームを理解し、ガチャを引き、育成し、戦い、報酬を受け取り、ギルドや他ユーザーとの関係を作り、再訪できること**。

主要ループを壊してまで機能数を増やさない。MUSTが危険な状態でSHOULDへ進まない。画像生成はCodexで行わない。サウンド制作はCodexで行わない。UI・演出はArt
Bibleと確定仕様を正とする。不明な仕様を推測して確定しない。最低品質を満たさない場合は公開日を延期する。
