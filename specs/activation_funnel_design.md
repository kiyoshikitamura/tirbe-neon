# TRIBE NEON --- Activation Funnel Design

更新日: 2026-08-12\
対象: ユーザー獲得〜初回PvP到達\
ステータス: 提案仕様（既存確定仕様との整合確認後に確定）

## 1. 目的

TRIBE
NEONの前半ファネルを、広告流入から「個人競争ユーザー」への転換として設計する。

`Ad / Invitation` → `Game Start` → `Tutorial Complete` → `Free Gacha` →
`Formation / Growth` → `Quest / First Battle` → `First PvP`

後半の `social_funnel_design.md`
と接続し、全体では以下を主要ファネルとする。

`Acquire` → `Tutorial Complete` → `First PvP` → `First Raid` →
`Guild Recommendation` → `Guild Join` → `Guild Activation` → `First GvG`
→ `Second GvG` → `Retained / Payer`

Open
BetaではGvG非開放のため、`Acquire → Tutorial → First PvP → First Raid → Guild Activation → Second Raid`
までを主要検証対象とする。

## 2. 最重要原則

前半ファネルの目的は、ゲーム内機能をすべて説明することではない。

ユーザーに短時間で以下を理解させる。

1.  キャラクターを獲得できる
2.  育成すると強くなる
3.  強さをバトルで実感できる
4.  他プレイヤーと競争できる
5.  もっと強くなりたい理由が生まれる

チュートリアルの説明量ではなく、**First
PvP到達率と到達時間**を重視する。

## 3. 広告 → Game Start

広告で提示する期待値と、ゲーム開始直後の体験を一致させる。

広告で「アウトロー / 抗争 / 仲間 / 強さ /
競争」を訴求する場合、開始後長時間ソロ育成だけをさせない。

確認対象:

-   広告クリックからゲーム表示までのステップ数
-   初回ロード時間
-   Landing / TitleのCTA
-   不要な説明・同意・入力による離脱
-   モバイルブラウザでの開始摩擦
-   広告クリエイティブと初回画面の世界観整合

ブラウザゲームの強みである「クリック後すぐ開始」を維持する。

## 4. Game Start → Tutorial Complete

チュートリアルは機能説明ではなく、最初の成功体験を作る導線として設計する。

優先する体験:

`Start` → `最低限の操作` → `初回報酬 / キャラ獲得` → `強化` → `戦闘` →
`成功`

長文説明、複数モーダル、不要な画面往復を避ける。

ユーザー名・認証は確定仕様に従い、必要以上にゲーム体験を分断しない。

### UI要件

-   次に押す場所が明確
-   主要CTAは1つに絞る
-   Skip可能な説明はSkip可能にする
-   Back / Reload / Session Restoreでも破綻しない
-   内部用語・英語キーを露出しない
-   原則としてユーザー向け表示言語を日本語へ統一する

## 5. Tutorial Complete → Free Gacha

チュートリアル完了直後に「獲得の喜び」を体験させる。

無料ガチャは単なる配布ではなく、ゲームの育成サイクルへの入口として扱う。

`Free Gacha` → `Character / Skill / Equipment` → `Result` → `Inventory`
→ `Growth`

ガチャ結果から「何が強くなったか」を理解できるようにする。

高レア獲得、重複、限界突破等の主要結果は適切にフィードバックする。

## 6. Gacha → Formation / Growth

取得後に「何をすれば強くなるか」が迷わないこと。

優先導線:

`取得` → `おすすめ編成 / 編成` → `強化` → `戦力上昇表示` → `Battle`

確認:

-   新規取得キャラが見つけやすい
-   装備 / スキル装着が理解できる
-   戦力変化が視覚的に分かる
-   強化後の次CTAが明確
-   不要な複雑さでFirst PvPを遅らせない

自動編成・おすすめ機能が既存実装にある場合は積極的に利用する。

## 7. Quest / First Battle

最初のQuest / Battleは、育成結果を確認する成功体験として使う。

目的:

-   強化した結果が戦闘へ反映されたことを理解
-   Battleの基本テンポを理解
-   報酬を獲得
-   次に競争へ進む準備

最初から難易度を高くしない。

Battle後は報酬だけで終わらず、次の主要コンテンツへのCTAを明確にする。

## 8. First PvP

First PvPを前半Activation Funnelの主要CV地点とする。

目的:

**ソロ育成ユーザー → 個人競争ユーザー**

への転換。

First PvPでは勝敗そのものより、

-   自分の現在の強さを理解
-   他Playerを認知
-   Rankingを認知
-   もっと強くなりたい理由を得る
-   次のRaid / Guild導線を認知

することを優先する。

### Result

最低限:

-   Win / Lose
-   自分 / 相手
-   Power等の比較可能情報
-   Reward
-   Rankingへの影響
-   次の行動CTA

後半ファネル仕様に従い、相手Guildが存在する場合は認知可能にする。

## 9. First PvP → Raid

First PvP後は、後半のSocial Funnelへ接続する。

`First PvP` → `Raid` → `Guild Recommendation` → `Guild`

強制遷移ではなく、自然なCTAでRaidを提示する。

例:

-   「次はRaidに挑戦」
-   開催中Raid
-   Raid報酬
-   現在のRaid状況

Guild未加入でもRaid参加可能とする方針は `social_funnel_design.md`
を参照する。

## 10. Homeの役割

Homeを単なるメニュー画面ではなく「次の最適行動」を提示する画面として扱う。

未到達ユーザーには進行状況に応じて主要CTAを変える。

例:

-   Tutorial中 → Tutorial継続
-   Gacha未体験 → 無料ガチャ
-   Growth未体験 → 強化
-   First Battle未完了 → Quest
-   First PvP未完了 → PvP
-   First Raid未完了 → Raid
-   Guild未加入 → おすすめTRIBE

すべてを同じ強さで表示しない。

## 11. Missionの役割

Missionを報酬配布だけでなく、ゲームサイクルを学習するナビゲーションとして使う。

初期導線候補:

`無料ガチャ` → `キャラ/装備/スキル確認` → `強化` → `Quest` → `PvP` →
`Raid` → `Guild`

既存Mission Masterで対応可能か確認する。

Mission報酬のためだけに行動させるのではなく、自然に次のコンテンツを学習させる。

## 12. UI / 演出優先順位

Activation Funnelでは以下を最優先でブラッシュアップする。

1.  Landing / Title
2.  Tutorial
3.  Home
4.  Free Gacha
5.  Gacha Result
6.  Formation
7.  Growth
8.  Quest
9.  Battle / Result
10. PvP / PvP Result

評価基準:

-   次に何をすればよいか
-   強くなったことが伝わるか
-   操作が気持ちよいか
-   待ち時間が長くないか
-   説明過多ではないか
-   広告との期待値ギャップがないか
-   First PvPまで不要な寄り道がないか

## 13. 表記

Open
Beta前の横断ブラッシュアップでユーザー向け表記を原則日本語へ統一する。

確認:

-   英語 / 日本語混在
-   内部キー
-   技術用語
-   ボタン名称
-   同一概念の表記揺れ
-   数値 / 単位
-   エラーメッセージ

固有名称・世界観上意図した英語表現はArt Bible / 確定仕様に従う。

## 14. バランスとの接続

First PvPまでのバランスは「育成の理解」と「強くなった実感」を優先する。

重点確認:

-   初期配布
-   無料ガチャ
-   初期育成コスト
-   初期AP
-   Quest報酬
-   First Battle難易度
-   First PvPマッチング / 相手強度
-   Mission報酬

暫定値は一元管理し、`CONFIRMED / PROVISIONAL / NEEDS_BALANCE_TEST`
等で状態管理する。

初回PvPで極端な戦力差を体験させ、「課金しないと無理」という印象を早期に作らない。

## 15. KPI / Analytics

Open Beta前半ファネル:

`Ad Click / Entry` → `Game Start` → `Tutorial Start` →
`Tutorial Complete` → `Free Gacha Complete` → `First Growth` →
`First Quest` → `First Battle Complete` → `First PvP`

可能であれば計測:

-   Game Start Rate
-   Tutorial Start Rate
-   Tutorial Complete Rate
-   Tutorial離脱step
-   Free Gacha到達率
-   First Growth到達率
-   First Quest / Battle到達率
-   First PvP到達率
-   Game Start → First PvP所要時間
-   各step間離脱率

広告側で取得可能ならCampaign / Creative単位と接続する。

大規模Analytics基盤が必要な場合は工数を先に報告する。

## 16. Social Funnelとの接続

本仕様は `specs/social_funnel_design.md` の前段として扱う。

全体ファネル:

`Acquire` → `Tutorial Complete` → `First PvP` → `First Raid` →
`Guild Recommendation` → `Guild Detail` → `Guild Join` →
`Guild Activation` → `Second Raid` → `First GvG` → `Second GvG` →
`Retained / Payer`

UI / Mission / Analyticsで前後が分断されないこと。

## 17. Open Beta受入条件

最低限:

1.  広告/EntryからGame Startまで大きな摩擦がない。
2.  Tutorialが中断・復帰を含め正常完了できる。
3.  Tutorial後に無料ガチャへ自然に到達できる。
4.  ガチャ取得物を編成 / 育成できる。
5.  育成結果がBattleへ反映される。
6.  First Quest / Battleを完了できる。
7.  First PvPへ自然に到達できる。
8.  First PvP後にRaidへ接続できる。
9.  各主要stepを計測可能にする。
10. ユーザー向け主要表記に致命的な英日混在がない。

## 18. 実装前確認

CodexはM8完了後、M9本格ブラッシュアップ前に以下を確認する。

1.  現在のTutorial / First Session実装
2.  First PvPまでの実画面数・操作数
3.  不要な摩擦
4.  既存Missionとの接続
5.  Home CTA構造
6.  Analytics実装状況
7.  DB / UIへの影響
8.  バランス暫定値
9.  推定改善工数
10. 最小工数でFirst PvP到達率を改善する案

既存確定仕様と矛盾する変更は無断実装せず報告する。
