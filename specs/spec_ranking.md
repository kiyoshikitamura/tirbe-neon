# システム仕様書：ランキング機能 (Ranking System)

共通UIデザインとロード方式は`ui_design_system.md`を正本とする。本書はランキング固有の集計、カテゴリ、必要表示項目を定義する。

本仕様書は、『TRIBE NEON』における各種ランキング機能（総合力、ギルド総合力、PvP、GvG、レイド）の集計判定基準、データベース設計、およびUI構造を定義します。

---

## 1. 機能概要

本作では、ゲーム内の競争性とアクティビティを高めるため、各主要コンテンツに紐付いた「デイリーランキング」および「シーズンランキング」の **ダブルランキングシステム** を採用しています。
すべてのランキングは、新設された **「ランキング」ページ（RankingTab）** にて統合管理され、タブおよびトグルによって切り替えて閲覧できます。

---

## 2. ランキング定義と集計判定基準

### ① 総合力ランキング
プレイヤーが設定した独立した「Main Formation」1〜5体の最終HP・ATK・DEF合算値を競います。PvP Defense、Raid、GvG、Quest、Tutorial編成とは分離します。
- **シーズン（絶対値）**: 全ユーザーの現在のMain Formation総合力を競います。SPD・LUK・Friend Leader・Skill/Passive効果は含めません。
- **デイリー（絶対値）**: 当日00:00 JST以降にServer側でactivityが記録されたユーザーの現在のMain Formation総合力を競います。rolling 24hは使用しません。

### ② ギルド総合力ランキング
所属ギルドメンバーの総合力の合計値を競います。
- **シーズン（絶対値）**: ギルド所属メンバー全員の現在の総合力の合計値を競います。
- **デイリー（絶対値）**: 本日アクティブな所属メンバーの現在の総合力の合計値を競います。

### ③ PvPランキング
PvPでの戦績を競います。
- **シーズン（ランクポイント）**: PvPシーズン終了時の「PvPランクポイント」を競います。
- **デイリー（勝利数）**: 毎日00:00 JST〜翌00:00 JSTまでの「PvP勝利数」を競います。

### ④ 抗争ランキング
GvGのギルドランクおよび個人貢献を競います。
- **シーズン（ギルドランク）**: 月次シーズン終了時のGvGレートによるギルド順位を競います。C〜S閾値、rate変動式、同率処理、ランク帯・最終順位RewardはPROVISIONALです。
- **シーズン（個人貢献）**: シーズン中にGvGで記録した実与ダメージを個人貢献ポイントとして集計し、ギルド内表示および報酬配分に使用します。
- 日次の拠点支配ポイントおよび「勝利+250／敗北-100」によるランキングは廃止します。GvGの詳細は`spec_battle_system.md`を優先します。

### ⑤ レイドランキング
拠点に出現する24時間ボス（レイドボス）に与えた累積ダメージ量を競います。
- **シーズン（累積ダメージ）**: レイドシーズン中に個人およびギルドがボスに与えた「累積ダメージの総和」を競います。
- **デイリー（ボスダメージ）**: 現在出現しているレイドボス1体に対して、個人およびギルドが与えた「総与ダメージ」を競います。

---

## 3. データベーステーブル設計

ランキングデータは、Supabase (PostgreSQL) の以下のテーブル構造で管理されます。

### A. `user_power_rankings` (新規追加)
ユーザーのMain Formation総合力を保持するServer-authoritative projectionです。ClientからのINSERT / UPDATE / UPSERTは禁止します。
```sql
CREATE TABLE user_power_rankings (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    total_power INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### B. Daily / Season Contract
- **Daily**: `users.last_active_at`等のServer-side activity markerをJST calendar dayで判定します。Power projectionの`updated_at`を書き換えてactivityを表現しません。
- **Season**: `ranking_seasons`の明示的な`season_id / ranking_type / starts_at / ends_at / status`を正本とします。Clientは暦月からSeasonを推測しません。

---

## 4. UI / UX 仕様 (画面フロー ＆ 表示)

### ① 遷移導線
- **ホーム画面サブアイコン**: `HomeTab` の左側サブメニュー（ミッション・プレゼントの並び）に、透過SVGの「ランキング」小アイコンを配置し、ワンタップでアクセスできます。
- **メニュー一覧画面**: フッター「メニュー」タップで開く `MenuTab` の一覧に「ランキング」ボタンを新設します。

### ② デザインスタイル (Matte Outlaw UI)
- 背景に夜の街のグラフィックが広がる「シームレスな全画面一体キャンバス構造」を徹底。
- リスト項目にはつや消しスチール調の行スタイル（金属ベゼルエッジ、鈍いネオン反射）を適用。
- 順位 badge には、1位（ゴールド）、2位（シルバー）、3位（ブロンズ）のグラデーションライティング反射を適用。
- スクロールバーはつや消しメタル調のグレー系（`rgba(160, 160, 170, 0.3)`）で統一し、派手なネオンカラーは完全排除します。

---

## 5. 更新・表示仕様（画面Open時Refresh、マイステータスHUD、公開詳細）

### ① Ranking Refresh
- Ranking画面を開いた時点で対象Ranking RPCを取得します。15分の全Bootstrap再実行には依存しません。

### ② 確定タイミングの明確化
- **デイリー**: 毎日00:00 JSTを境界とし、Server queryがJST calendar dayで対象を判定します。Client起点のreset RPCには依存しません。
- **シーズン**: `ranking_seasons`で明示された終了日時とstatus遷移を正本とします。

### ③ マイステータスの常時表示 (Sticky HUD)
- 各ランキングリストの最上部に、現在の自分の順位とスコア（総合力、勝利数、ポイント、ダメージなど）を固定表示する `my-rank-sticky-bar`（つや消しスチール調、つや消しシルバーベゼル境界線）を配置し、スクロールに影響されず常時確認可能です。

### ④ 詳細ポップアップ（プレイヤー自己紹介ポップアップ ＆ ギルド紹介ポップアップ）
- ランキングの行をタップすると、それぞれの詳細ポップアップがすりガラス風のエフェクトを伴ってフェードインします。
- **他プレイヤー**:
  - Player Name、Level、Guild公開情報、Main Formation Total Power
  - Main Formation 1〜5体のCharacter public master ID、表示名、Level、Rarity、Awakening、Character Power
  - owner row ID、Currency、Inventory、Skill/Equipment Build、取引情報は公開しない。
- **他ギルド**:
  - ギルド名、レベル、将来用ギルドアイコン（エンブレム）、将来用ギルド称号プレースホルダー（新宿の覇者など）
  - 代表者（ギルドマスター）名、所属アライメント属性（ORDER: 青/金、CHAOS: 赤）
  - ギルド紹介文、メンバー数（所属数 / 上限）
  - 現在支配しているエリア一覧（「支配エリア: 新宿」等と表記）

## 2026-08-17 Production Contract
- Ranking Reward値と自動配布は本工程の対象外です。旧`distribute_ranking_rewards`のClient実行経路をProduction契約として使用しません。
- 実装正本は`ranking_power_p0_foundation.md`およびmigration `00154`〜`00158`を参照します。
