# UI Stage 0 現状監査・移行設計

監査日: 2026-08-07  
対象計画: [ui_implementation_plan.md](ui_implementation_plan.md)  
共通受入基準: [ui_design_system.md](ui_design_system.md)

## 1. 結論

Stage 0の対象画面、共通部品、状態、ロード、アセット、信頼境界を監査し、Stage 1以降の移行先を確定した。

優先して解消する横断課題は次のとおり。

1. 画面ごとの独自カード、ボタン、タブ、ローダー、モーダルを共通プリミティブへ移行する。
2. 安全領域とスクロールの所有者を`PageShell`に一本化し、iPhone Safariでの二重余白と固定要素の衝突をなくす。
3. 画面単位の必須データ・画像マニフェストを導入し、必須要素が揃うまでスピナーを表示する。
4. PvP/GvG編成等の重要更新をRPCへ移し、クライアントの表示制御に依存しない認可へ変更する。
5. 画像パス、空状態、未解放、失敗状態を共通契約へ揃える。

Stage 0では製品コード、DB、画面表示を変更しない。本書を以後の実装判断の台帳とする。

## 2. 画面・共通部品対応表

| 対象 | 現在の主要コンポーネント | 現在の構造 | 移行先 | Stage |
| --- | --- | --- | --- | --- |
| 共通シェル | `page.tsx`、`Header`、`Footer` | ルート側と各オーバーレイが個別に余白・スクロールを管理 | `PageShell`、`PageHeader`、共通下部ナビ、安全領域の単一所有 | 1 |
| クエスト | `PatrolTab` | 一部共通カード、背景と操作は固有実装 | `HubPage` + `HeroPanel` + `ActionCard` | 2 |
| PvP | `PvpTab` | 一部共通部品、一覧とローダーは固有 | `CompetitionHub` + `OpponentList` | 2 |
| GvG | `GvgTab`、`GvgMatchStatusPanel` | ほぼ固有UI | `CompetitionHub` + `MatchStatus` | 2 |
| レイド | `RaidTab` | 固有カード・状態・処理中テキスト | `EventHub` + `BossStatus` | 2 |
| ギルド | `GuildTab` | 共通部品と固有部品が混在 | `CommunityHub` + `MemberList` | 3 |
| チャット | `TribeChatModal` | 共通全画面パネルを一部使用 | `SocialPanel` + `MessageList` | 3 |
| BBS | `BbsTab` | 独自タブ・カード・入力・CSS | `SocialPanel` + `ThreadList` | 3 |
| フレンド | `FriendPanel` | 共通全画面パネルを一部使用 | `SocialPanel` + `UserList` | 3 |
| ミッション | `MissionPanel` | 共通部品を一部使用 | `RewardPanel` + `RewardList` | 4 |
| プレゼント | `InboxPanel` | 共通全画面パネルを一部使用 | `RewardPanel` + `RewardList` | 4 |
| ログインボーナス | `LoginBonusModal` | 独自モーダル・日別セル | `RewardPanel` + `RewardCalendar` | 4 |
| ガチャ | `GachaTab` | 独自UI、バナー画像URLを表示用途へ未利用 | `CollectionPage` + `BannerHero` + `ResultModal` | 4 |
| ショップ | `ShopTab` | 共通部品と独自ローダーが混在 | `CollectionPage` + `ProductGrid` | 4 |
| マイバック | `BagTab` | 独自タブ・カード・詳細・CSS | `CollectionPage` + `ItemGrid` + `ItemDetail` | 4 |
| お知らせ | `InboxPanel`内のお知らせ表示 | プレゼントと同一パネルに混在 | `InformationPanel` + `NoticeList` | 5 |
| 設定 | `SettingsPanel` | 共通パネル、一部処理中をテキスト表示 | `SettingsPage` + `FormSection` | 5 |
| 拠点移動 | `MoveBaseModal` | 独自モーダル、保存完了前に閉じる | `SelectionPanel` + `ConfirmDialog` | 5 |
| 共通モーダル | `CommonModals` | 用途ごとの条件分岐が集中 | 用途別モーダル + 共通`ModalShell` | 1〜5 |

ホームとキャラクターページは対象外にせず、各Stageの共通シェル回帰対象とする。本番データ・本番画像を使う色と密度の最終調整はPOLISH工程で行う。

## 3. 共通部品の統合方針

### 3.1 維持して拡張するもの

| 現在の部品 | 方針 |
| --- | --- |
| `OutlawButton` | Primary、Secondary、Ghost、Dangerと処理中状態をトークン化する |
| `OutlawCard` | `Card`の基礎として維持し、用途固有の装飾をvariantへ限定する |
| `SectionHeader` | `PageHeader`と`SectionHeader`の責務を分離して維持する |
| `SubTabNav` | Tabs/Filterの共通契約へ拡張する |
| `FullScreenPanel` | `PageShell`配下の`ModalShell`へ再構成し、安全領域とスクロール所有を外す |

### 3.2 新設するもの

- `PageShell`、`PageHeader`、`HeroPanel`
- `Card`、`ListRow`、`Badge`、`ResourceDisplay`、`RarityFrame`
- `ModalShell`、`ConfirmDialog`
- `Spinner`、`EmptyState`、`ErrorState`、`LockedState`、`PermissionState`、`ProcessingState`
- `ScreenAssetManifest`、`ScreenReadinessBoundary`、共有画像Promiseキャッシュ
- 二重送信を防ぐ共通mutationフックと、サーバーエラーのUI状態変換

### 3.3 廃止または統合するもの

- 各画面CSS内の独自ボタン、カード、タブ、バッジ、スピナー
- `GachaTab.css`の`!important`依存
- `BbsTab`、`BagTab`、`LoginBonusModal`の独自モーダル／一覧骨格
- `ShopTab`の画面全体を操作中ローダーで置き換える実装
- `RaidTab`、`SettingsPanel`の「処理中...」等の文字だけのローディング
- `CommonModals`に追加され続ける用途固有分岐

## 4. 画面状態マトリクス

記号: ○ 現在あり、△ 部分実装、― 不足。Stage 1で状態部品を作り、各画面Stageで全欄を埋める。

| 画面 | 初期読込 | 空 | 未解放 | 開催状態 | 処理中 | 失敗 | 権限不足 | 主な不足 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| クエスト | ― | ○ | △ | △ | ○ | ― | - | 初期読込、取得失敗、再試行 |
| PvP | △ | ○ | △ | △ | ○ | △ | - | シーズン状態、統一失敗表示 |
| GvG | △ | ○ | △ | ○ | ○ | △ | △ | 権限、参加不可、再取得 |
| レイド | ― | △ | ○ | ○ | △ | ― | △ | 初期読込、失敗、画像不在 |
| ギルド | △ | ○ | ○ | △ | ○ | △ | △ | 全体読込、操作別エラー |
| チャット | △ | ○ | △ | - | ○ | △ | △ | 初期取得、再接続、送信失敗 |
| BBS | ○ | ○ | △ | - | ○ | △ | △ | 共通エラー、投稿権限 |
| フレンド | ― | ○ | - | - | △ | ― | - | 初期読込、失敗、再試行 |
| ミッション | ― | ○ | △ | △ | ○ | △ | - | 初期取得、期限・未解放 |
| プレゼント | ― | ○ | △ | △ | ○ | △ | - | 初期取得、期限、再試行 |
| ログインボーナス | ― | △ | △ | ○ | △ | ― | - | 取得失敗、日付更新 |
| ガチャ | ― | △ | △ | △ | ○ | △ | - | 初期読込、空、期間終了 |
| ショップ | △ | △ | △ | △ | ○ | △ | - | 空、販売終了、残高不足統一 |
| マイバック | ― | △ | △ | - | ○ | △ | - | 初期読込、空、使用不可 |
| お知らせ | ― | ○ | - | △ | △ | ― | - | 初期読込、取得失敗、既読同期 |
| 設定 | ― | - | - | - | △ | ○ | △ | スピナー、サーバー認可表示 |
| 拠点移動 | ― | △ | ○ | - | ― | ― | - | 保存待機、失敗、再試行 |

共通状態契約は`idle | loading | ready | empty | locked | processing | success | error | forbidden`とし、イベント画面は別軸で`before | active | ended`を持つ。状態によるボタン非表示や無効化は認可の代替にしない。

## 5. ロード・キャッシュ・画面構造監査

### 5.1 現状

- `page.tsx`はホーム用`HOME_BOOT_ASSETS`だけを先読みし、遷移先画面の必須画像を保証しない。
- `useImagePreloader`は画像ごとの`Image`読込を集計するが、画面間共有Promise、タイムアウト、必須／任意、再試行の契約がない。
- PvP等はデータ取得後に画像を個別先読みし、画面内で段階表示が起こり得る。
- 動的importのフォールバックと画面内ローダーが別管理で、同じ遷移に複数ローダーが存在する。
- `FullScreenPanel`とアプリシェルがそれぞれ安全領域を持ち、二重余白の可能性がある。
- `view-container`、`scroll-container`、全画面パネル等にスクロール所有が分散している。

### 5.2 移行先

1. ルートごとに必須データ、必須画像、任意画像を宣言する。
2. 必須データと必須画像を並列取得し、`ScreenReadinessBoundary`が完了まで一つのスピナーを表示する。
3. 必須画像失敗時は代替画像を確定してから一括表示し、個別画像の後追い出現をさせない。
4. 静的画像はURL単位の共有Promise、APIは同一query key単位で重複取得を抑止する。
5. 再訪時はキャッシュを利用し、更新後は影響するquery keyだけを再検証する。
6. 安全領域、ヘッダー、本文スクロール、下部ナビを`PageShell`だけが所有する。

## 6. 直接更新・セキュリティ移行一覧

| 優先 | 現在の箇所 | 現状 | 移行先 | 実施Stage |
| --- | --- | --- | --- | --- |
| P0 | `usePvp.ts` | `pvp_defense_decks`、`user_power_rankings`を直接upsert | 所有者・編成内容を再検証する保存RPC、直接書込拒否RLS | 1〜2 |
| P0 | `GameContext.tsx` パーティ保存 | `pvp_defense_decks`へ直接insert/update | PvP編成保存RPCへ統合 | 1〜2 |
| P0 | `GameContext.tsx` GvG防衛 | `gvg_defense_decks`を直接delete/upsert | ギルド所属、権限、ロック時刻を検証するRPC | 1〜2 |
| P0 | PvP/GvG初期RLS | permissiveな`Allow all access`系policyが残る可能性 | migrationで明示的にdropし、select/write policyを分離 | 1〜2 |
| P1 | `GameContext.tsx` 拠点移動 | `users.current_base_id`を直接update | 解放条件と拠点IDを検証するRPC | 1〜5 |
| P1 | `useInventory.ts` 管理用日次処理 | プレゼントを直接insert | 管理者RPC/運営ツールへ隔離 | 1〜4 |
| P1 | `GameContext.tsx` GvG管理リセット | 複数テーブルをクライアントから直接更新 | 管理者RPC/Edge Functionへ隔離 | 1〜2 |
| P1 | QA投入・リセット | クライアントのメール判定でボタン制御 | RPC内で管理者/許可アカウントを検証 | 1 |
| P2 | `GameContext.tsx` Stripe模擬処理 | 決済履歴を直接insert | 開発専用経路へ隔離。本番決済確定は別工程 | 1〜4 |
| P2 | `GameContext.tsx` 旧ガチャ・天井コード | 到達不能だが`Math.random()`と直接書込を保持 | 削除し、現行抽選RPCだけを利用 | 1〜4 |
| P2 | `GameContext.tsx` 旧BBS/NPC投稿 | 直接insertの旧経路が残る | 現行RPCへ統合または削除 | 1〜3 |
| 保留 | 旧アバター保存 | 直接insert/upsert | 現行キャラ・装飾系との統合時に別途移行 | POLISH以前 |

既にRPC化されているクエスト、ギルド主要操作、チャット/DM/BBS書込、フレンド操作、アイテム使用、プレゼント/ミッション受取、現行ガチャ、通常ショップ処理は維持する。ただし、RPC内の認可と冪等性をStage 1で再確認する。

## 7. 画面アセットマニフェスト

| マニフェスト | 必須アセット | 任意／後工程アセット | 既知の問題 |
| --- | --- | --- | --- |
| `common-shell` | ヘッダー通貨、下部ナビ、共通フォールバック | 通知バッジ演出 | 安全領域と別にロード責務を統合する |
| `quest-hub` | 選択拠点背景、AP/報酬アイコン | クエスト固有カット | `MoveBaseModal`の`junk_bazaar`が拠点定義と不一致 |
| `pvp-hub` | 自キャラ、対戦相手フォールバック、ランク | シーズン装飾 | 対戦相手画像をデータ取得後に個別読込 |
| `gvg-hub` | ギルド紋章、参加キャラフォールバック | 対戦カード背景 | 動的キャラ画像の失敗契約がない |
| `raid-hub` | ボスの共通フォールバック、報酬 | 本番ボス、背景 | 現在ボス/背景画像がない |
| `guild` | ギルド紋章、メンバーフォールバック | ギルド装飾 | 動的アバターをmanifestへ取り込む |
| `social` | ユーザーフォールバック、投稿種別 | BBS添付 | 旧ルート直下キャラパスが混在 |
| `reward` | 通貨、アイテム、受取済み状態 | 本番報酬画像 | 現在テキスト中心。DATA/ASSET工程で追加 |
| `gacha` | バナー、通貨、レアリティ枠、結果フォールバック | 本番演出 | `banner_image_url`を画像として表示していない |
| `shop` | 商品バナー、価格通貨、商品フォールバック | 本番商品画像 | `banner_beginner_pack.png`は存在 |
| `bag` | カテゴリアイコン、アイテムフォールバック | 本番アイテム画像 | CSS/文字表現が中心 |
| `information` | お知らせ種別、重要度 | 記事画像 | 画像失敗時の代替契約がない |
| `settings` | 設定種別 | なし | QA表示は環境/認可状態と分離する |
| `move-base` | 全拠点サムネイル、選択状態 | 本番拠点画像 | 拠点ID定義を一元化する |

キャラクター画像の正規パスは`/characters/*.png`とする。`/reiji_transparent_asset.png`等のルート直下参照が複数箇所に残る一方、実ファイルは`/characters/`配下にあるため、Stage 1でアセットレジストリへ統合する。

## 8. Stage別の主な変更対象ファイル

実装時に依存関係から追加されるファイルは許容するが、新しい画面固有プリミティブを増やさない。

| Stage | 主な既存ファイル | 主な新設先 |
| --- | --- | --- |
| 1 共通基盤 | `page.tsx`、`Header*`、`Footer*`、`CommonModals*`、`components/ui/*`、`useImagePreloader.ts`、`GameContext.tsx`、`usePvp.ts`、`useInventory.ts`、関連migration | `components/ui/PageShell*`、状態部品、readiness/cache、secure mutation、RLS/RPC migration |
| 2 戦闘ハブ | `PatrolTab*`、`PvpTab*`、`GvgTab*`、`GvgMatchStatusPanel.tsx`、`RaidTab*` | ハブテンプレート、fixture、画面manifest |
| 3 コミュニティ | `GuildTab*`、`BbsTab*`、`TribeChatModal*`、`FriendPanel*` | ソーシャルテンプレート、共通ユーザー/投稿一覧、manifest |
| 4 報酬・収集・経済 | `MissionPanel*`、`InboxPanel*`、`LoginBonusModal*`、`GachaTab*`、`ShopTab*`、`BagTab*` | 報酬/コレクションテンプレート、共通取得結果、manifest |
| 5 補助 | `InboxPanel*`、`SettingsPanel*`、`MoveBaseModal*` | お知らせ一覧、設定フォーム、選択パネル、manifest |
| 6 横断検証 | 全対象画面、ホーム、キャラクター、E2E、visual regression | 画面状態fixture、iPhone Safari回帰、性能計測 |

## 9. Stage 0 完了判定

- [x] 全対象画面の現コンポーネントと移行テンプレートを確定した。
- [x] 維持、拡張、廃止する共通部品を区別した。
- [x] 正常以外を含む画面状態の不足を記録した。
- [x] ロード、キャッシュ、安全領域、スクロールの移行方針を確定した。
- [x] 直接更新とセキュリティ移行対象を優先度付きで記録した。
- [x] 画面アセットマニフェスト候補と既知のパス不整合を記録した。
- [x] Stageごとの主な変更対象ファイルを確定した。
- [x] 既存機能を維持する箇所と再構成する箇所を区別した。

次の着手点はStage 1（UI-0B）である。共通基盤をクエスト、PvP、GvG、レイドへ適用できる状態にしてから、4画面をまとめて実機確認へ出す。
