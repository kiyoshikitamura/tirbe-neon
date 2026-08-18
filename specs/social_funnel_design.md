# TRIBE NEON --- Social Funnel Design

更新日: 2026-08-12 ステータス:
提案仕様（既存確定仕様との整合確認後に確定）

## 1. 上位方針

主要サイクルを以下とする。

`Quest / Gacha / Growth → PvP → 全体Raid → Guild Discovery / Recommendation → Guild Join → Guild Activation → GvG & Raid → Reward / Growth`

Open BetaではGvG非開放のため、`Growth → PvP → Raid → Guild`
を主要なソーシャル転換ファネルとする。

-   PvP: 個人競争への入口。他プレイヤーと所属TRIBEを認知させる。
-   Raid: 集団プレイへの入口。Guild未加入でも参加可能。
-   Guild: コミュニティへの入口。加入後の活動開始までを転換対象とする。
-   GvG: 最終的な集団競争・主要継続コンテンツ。
-   Ranking: 順位表示だけでなくPlayer/Guild Discovery装置として扱う。

## 2. 解決する課題

現状はユーザー自身がGuildを発見・検索・加入する行動への依存が高い。

Guild Join Rateだけでなく、活動中Guildへの人口集約、加入後のSocial
Activation、Raid再参加、GvG開放後の初回/2回目GvG参加を重視する。

## 3. Raid

既存確定仕様の「毎日ランダム2拠点、各24時間、Raid専用原資、Boss
Master、個人/Guildランキング、撃破/失敗報酬、2拠点独立集計」は維持する。

今回、RaidをGuild専用ではなく**全ユーザー参加可能な全体Raid**として明文化する。

Guild未加入でも基本プレイ・基本報酬を成立させる。Guild所属者には以下を追加価値として与える。

-   Guild Raid Ranking
-   Guild Contribution可視化
-   Guild内Contribution順位
-   Guild Raid報酬
-   Guild Chatによる情報共有

未加入者への報酬減額などのペナルティ方式は採用しない。

### Contribution

Raid参加にguild_idを必須としない。途中加入/脱退/移籍で過去Contributionが移動しないことを必須とする。

推奨は、Contribution発生時点のGuild所属をsnapshotとして記録し、そのContributionを当該Guildへ固定する方式。実装前に現行schema/集計方式を確認し、既存方式でより低コストかつ安全ならそちらを優先する。

## 4. PvP → Guild

PvP
Rankingでは可能な範囲でRank、Player、Power/PvP指標、所属Guildを表示する。Guild名からGuild
Detailへ遷移可能にする。

`PvP Ranking → Player/Guild → Guild Detail → Join/Apply`

PvP ResultでもOpponent、Power、Guildを認知できるようにし、Guild
Detailへ接続する。未所属ユーザーへの強制ポップアップは避ける。

## 5. Raid → Guild

未所属ユーザーのRaid画面/Resultには、個人順位、Damage/Contribution、TRIBE未所属表示と
`おすすめTRIBEを見る` CTAを置く。

「TRIBEに加入するとGuild Ranking / Guild
Rewardに参加できます」と既存メリットを可視化する。

所属ユーザーには、個人Raid順位、Contribution、所属Guild、Guild
Raid順位、Guild累積Contribution、Guild内Contribution順位を表示し、「参加した意味」と「Guildに貢献した意味」を可視化する。

## 6. Ranking改修

### Raid Individual Ranking

全ユーザー対象。Rank、Player、Damage/Contribution、Guildを表示候補とし、Player/Guild詳細へ接続。

### Raid Guild Ranking

Guild、Total Contribution、Member
Count、可能ならRaid参加人数を表示。未所属ユーザーも閲覧可能とし、Guild
Detailへ接続する。

### 横断方針

最低限以下を成立させる。

-   PvP Ranking → Player → Guild
-   Raid Individual Ranking → Player → Guild
-   Raid Guild Ranking → Guild
-   Guild Ranking → Guild Detail
-   Guild Detail → Join / Apply

RankingをPlayer/Guild Discovery UIとして利用する。

## 7. Guild Recommendation

Guild未加入ユーザーへゲーム側からおすすめGuildを提示する。

目的は単純なJoin Rate最大化ではなく**Active Guild Densityの向上**。

最低条件: - 加入可能 - 空き枠あり - 一定の直近Activityあり

可能な範囲でMember Count、空き枠、直近Activity、Raid参加人数、Chat
Activity、Guild Power、ユーザー戦力/進行度との適合を利用する。

戦力上位Guildだけを推薦しない。活動度が高く満員ではないGuildへ新規ユーザーを集約する。

概念例: - 1/10・低Activity: 低評価 - 4/10・低Activity: 低評価 -
6/10・高Activity: 高評価 - 8/10・高Activity: 最優先候補 - 満員:
推薦対象外

初期版で複雑なAI推薦は不要。具体的な重みは既存DBとOpen
Betaデータを見て調整する。

## 8. Recommendation UI

優先表示箇所:

1.  Raid Result
2.  Guild未所属Home
3.  Guild Discovery
4.  PvP / Ranking
5.  Mission

表示カテゴリ例: - あなたにおすすめ - 活発なTRIBE - メンバー募集中

同一画面で過度な推薦表示を行わない。

## 9. Join / Activation

推薦後は
`Recommendation → Guild Detail → Join/Apply → Welcome → Guild Activation`
とする。

即時加入設定が既にある場合は利用する。ない場合、Auto Join / Join
Policy追加は提案仕様としてDB・権限・運営影響を確認してから確定する。

Guild Detailでは既存仕様の範囲でGuild Name、Level、Member
Count、Leader、Members、Power、Ranking、Raid実績/順位、Join/Apply
CTAを優先する。

加入を最終CVにせず、`Guild Join → Welcome → Guild Chat → Guild Status → Raid Guild Contribution → Raid`
まで誘導する。

GvG開放後は `Next GvG → First GvG → Second GvG` を追加する。

## 10. Mission / Home

初期Missionは可能な範囲で
`無料ガチャ → 強化 → Quest → PvP → Raid → Guildを見る → Guild加入 → Guild Social`
を学習させる。既存Mission Masterで対応可能か確認する。

未所属Homeでは適切なタイミングで次のPvP/Raid、おすすめTRIBE、Guild加入メリットを提示する。GvG開放後は次回GvG時刻・準備導線を追加する。

## 11. UI対象

重点確認画面: Home / PvP / PvP Result / PvP Ranking / Raid / Raid Result
/ Raid Individual Ranking / Raid Guild Ranking / Guild Discovery / Guild
Ranking / Guild Detail / Guild Join・Apply / Mission

新規大型画面より既存画面間の接続強化を優先する。

## 12. KPI / Analytics

Open Betaファネル:

`First PvP → First Raid → Guild Recommendation Impression → Guild Detail View → Guild Join/Apply → Guild Activation → Second Raid`

GvG開放後: `→ First GvG → Second GvG`

主要候補: - PvP/Raid/Recommendation → Guild Detail CTR - Guild Detail →
Join Conversion - Recommendation → Join Conversion - Guild Activation
Rate - Guild加入前後のRaid参加率 - Second Raid Participation - Active
Guild Density - Guild別Active Member数 - Guild別Raid参加人数 - First /
Second GvG Participation

大規模Analytics基盤が必要なら実装前に工数を報告する。

## 13. 運営・課金影響

Recommendationは人口配置を制御する運営装置として扱う。Guild数、Active
Guild数、Active
Member分布、過疎/満員Guild比率、推薦経由加入、中堅Guild形成を監視する。

直接課金機能は追加しない。`PvP/Raid → 他者/Guild認知 → 競争/貢献欲求 → Growth → Gacha/Monetization`
の間接接続を狙う。

Guild未加入への課金・報酬ペナルティは導入しない。

## 14. Open Beta Day 1候補

-   Friend Invitation
-   Friend / Helper
-   PvP
-   全体Raid
-   PvP/Raid/Ranking → Guild Discovery
-   Guild Recommendation
-   Guild Join / Activation導線

Production、E2E、Critical Bug修正を犠牲にしてまで入れない。

## 15. 受入条件

1.  未加入ユーザーがPvP/Raidを利用できる。
2.  PvP/Raid/RankingからGuild Detailへ到達できる。
3.  未加入ユーザーへおすすめGuildが提示される。
4.  Guild DetailからJoin/Applyできる。
5.  加入後Guild Chat/Raid Guild Contributionへ到達できる。
6.  Raid個人ContributionとGuild Contributionが正しく集計される。
7.  Raid途中の加入/脱退/移籍で過去Contributionが不正移動しない。
8.  未加入でもRaid基本プレイ/基本報酬が成立する。
9.  Recommendation → Detail → Join → Activationを計測可能にする。

## 16. 仕様上の扱い

### 維持する確定仕様

-   PvP常時開催
-   Raid毎日2拠点・各24時間
-   Raid専用原資
-   Raid個人/Guildランキング
-   Guild
-   GvGが主要エンドコンテンツ

### 提案・整合確認が必要

-   Raidを全ユーザー参加可能と明文化
-   Contribution発生時Guild snapshot
-   Guild Recommendation scoring
-   Auto Join / Join Policy
-   Recommendation UI
-   Guild Activation onboarding
-   Analyticsイベント追加

既存確定仕様と矛盾する場合は無断変更せず差分を報告する。

## 17. 実装前確認

Codexは実装前に以下を報告する。

1.  既存仕様との矛盾
2.  現在実装との差分
3.  DB / migration / RPC / RLS影響
4.  UI影響
5.  運営影響
6.  課金影響
7.  Analytics影響
8.  推定追加工数
9.  Day 1への影響
10. 低コストな縦切り案

確認完了まで大規模な実装変更には着手しない。
