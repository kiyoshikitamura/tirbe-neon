# UI リリース監査バックログ

正本: [ui_ux_benchmark_strategy.md](ui_ux_benchmark_strategy.md)

## 管理方法

各画面は、機能・情報設計・デザイン・演出・状態・操作・性能の7観点を確認するまで完了にしない。

| 状態 | 意味 |
| --- | --- |
| 未監査 | 画面実機確認とギャップ記録が未実施 |
| 監査中 | ギャップと受入条件を記録中 |
| 実装中 | ギャップに対応する変更を実装中 |
| 検証待ち | 操作・表示・状態の確認待ち |
| 完了 | 7観点と回帰確認を通過 |

## 現状認識

| 領域 | 対象画面 | 現状 | 優先度 |
| --- | --- | --- | --- |
| ホーム | HomeTab、Header、Footer | UIは約90%。全画面との統一監査・必要な再設計・演出改修の対象 | 中 |
| キャラクター | CharacterTab、CommonModals | UIは約70〜80%。全画面との統一監査・必要な再設計・演出改修の対象 | 中 |
| 主ゲームループ | PatrolTab、MoveBaseModal、CardBattleView | 未監査 | 最優先 |
| 抗争・協力 | PvpTab、GvgTab、GvgMatchStatusPanel、RaidTab、GuildTab | 未監査 | 最優先 |
| 成長・収集・経済 | GachaTab、ShopTab、BagTab、MissionPanel、InboxPanel、RankingTab | 未監査 | 高 |
| ソーシャル・補助 | BbsTab、TribeChatModal、FriendPanel、SettingsPanel、MenuTab、LegalPanel | 未監査 | 高 |
| 初回体験 | TitleView、AuthView、SetupView、Tutorial* | 他画面完成後に監査 | 最後 |

## 監査順序

### 1. 主ゲームループ

- PatrolTab
- MoveBaseModal
- CardBattleView（準備、再生、スキル、決定イベント、リザルト）

確認重点: 目的の明確さ、AP／報酬／再挑戦、バトル演出のテンポ、再開・失敗導線。

### 2. 抗争・協力

- PvpTab
- GvgTab / GvgMatchStatusPanel
- RaidTab
- GuildTab

確認重点: 開催前・開催中・結果・非参加、個人貢献、組織貢献、次の行動、権限状態。

### 3. 成長・収集・経済

- GachaTab
- ShopTab
- BagTab
- MissionPanel
- InboxPanel
- RankingTab

確認重点: 受取、獲得、成長、上限、残高不足、空状態、高レア演出。Stripe決済確定処理は対象外とする。

### 4. ソーシャル・補助

- BbsTab
- TribeChatModal
- FriendPanel
- SettingsPanel
- MenuTab
- LegalPanel

確認重点: 投稿なし、友達なし、読み込み、失敗、通知、モーダルの閉鎖、文字量。

### 5. ホーム・キャラクターの統一改修

- HomeTab
- CharacterTab

確認重点: 背景、立ち絵、通知、報酬、レアリティ、成長結果、画面遷移、他画面との情報階層・操作・演出の統一。不整合があれば既存構造も改修する。

### 6. 初回体験

- TitleView
- AuthView
- SetupView
- TutorialWorldIntro
- TutorialFreeInstant
- TutorialRuleGuide
- TutorialBattlePrompt
- TutorialAuthentication
- TutorialNavigator

確認重点: 完成済みの本編導線との一貫性、離脱防止、認証前後の状態遷移。
