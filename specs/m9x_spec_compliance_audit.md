# M9-X Specification Compliance Audit

更新日: 2026-08-18

## 正本

1. Human Decision
2. `GAME03_M9X_Codex_Package/01_game_common_cold_start_social_formation.md`
3. `GAME03_M9X_Codex_Package/02_game03_m9x_initial_ux_presentation.md`
4. Package内wireframe
5. `specification_reconciliation.md` / `product_decisions.md`
6. 各確定仕様書 / Art Bible

現行実装は正本ではない。Raid/GvGのBattle中UIのみPackage wireframeを正本とせず、既存の確定Battle/Raid/GvG仕様を優先する。

## Specification Compliance Matrix

| Screen | Spec | Current (監査時) | Mismatch | Action |
| --- | --- | --- | --- | --- |
| Title | 正式KV、`TAP TO START`、開始選択 | 正式KVと開始選択あり | 重大差異なし | 維持。遷移回帰のみ確認 |
| World Introduction | Full Screen / Full Bleed、Package §2の全文、最小進行操作 | 下部Card、独自見出し・説明Box・CTA | P0 | Card/Boxと独自Copyを除去し、Package全文を画面へ直接表示 |
| Ageha Introduction | Package §3の挨拶、世界観を維持 | 独自見出し・独自挨拶、英語kicker | P0 | Package Copyへ完全一致 |
| Name Input | 同背景のDialogを優先、Package §3の案内 | 別ページ風Card、独自説明 | P0 | 世界観を維持したDialogへ変更し、一般UI文言だけ残す |
| Tutorial Gacha | 画像バナー主体、Package §4/§6、無料10連、全10枚Tap | 独自3人ヒーロー、独自英語/説明 | P0 | 既存バナー画像主体へ戻し、Package Copyと取引情報だけ表示 |
| Gacha Result 1〜9 | Visual / Rarity / Name / Primary Parameters、1枚ずつTap | 順次Revealあり。Role/Attribute等も表示 | 一部過剰情報 | Packageで許可された最小情報へ限定 |
| SSR Result | 暗転→固有一言→Light/Neon→Visual→Rarity/Name/Primary Parameters | 専用Omen/Revealあり | 固有一言の根拠・独自英語を再監査 | 正本にない固有Copyは表示せず、専用Visual差のみ維持 |
| Formation | Tutorial確定SSR、おまかせ編成、Skill自動装備、装備操作なし | 自動編成は成立。独自説明・Growth接続が混在 | P0 | Package Copyへ変更。既存Server処理は維持 |
| Quest | 新宿/初級/確定SSR固定。派遣前=街+カード、派遣中=街+進行、帰還=キャラ+成果 | フォーム/段階Track中心、独自説明 | P0 | wireframe hierarchyへ寄せ、独自段階Copyを除去 |
| Speed-Up | Package §4、進行高速化→短いEffect→帰還 | 無料時短は成立。独自説明あり | Copy差異 | Package Copyへ変更。Server処理維持 |
| NPC Battle Pre | Leader/Party→VS→Enemy→主要情報→BATTLE START | 構造は概ね成立。独自Tutorial Copyあり | Copy差異 | Package Copyへ変更 |
| NPC Battle | 既存Battle仕様、背景、Skill/Damage/HP演出 | Viewer成立 | 許可英語と独自英語を要整理 | 既存Engine/Replay不変。表示だけ監査 |
| Battle Ending | Final Damage→HP0→Ending Hold→WIN/LOSE | Ending Holdあり | 重大差異なし | 回帰確認 |
| Battle Result | WIN/LOSE→共通情報→Quest EXP/Item→次CTA | 専用SummaryとQuest報酬が分離 | 二重表示可能性を監査 | Package順序を維持し、独自説明を除去 |
| WORLD Slide | Package §5の正本Copy | 独自短文 | P0 | 正本Copyへ完全一致 |
| POWER Slide | Package §5の正本Copy | 独自短文 | P0 | 正本Copyへ完全一致 |
| TRIBE Slide | Package §5の正本Copy、Lv8注記 | 独自短文、Lv8注記不足 | P0 | 正本Copyへ完全一致 |
| Mission Hub | Tutorial後に直接接続するProduct Navigation | Home遷移後、Missionは任意Modal | P0 | RULE_GUIDE完了時にMissionを開く。既存Mission/RPCを再利用 |
| Practice Battle | NPC明示、無報酬・無戦績・無Point消費 | 既存Practice mode成立 | 重大差異なし | Functional回帰 |
| Activity | 実在Playerのみ。SSR本人保証、Rank #1交代、TRIBE設立 | Home tickerで成立 | fallback独自Copyあり | 正本イベント表示のみ残す |
| Profile | Activity/Ranking/Chatの名前Tap→公開Profile | 既存Popupあり | 重大差異なし | Functional回帰 |
| Guild Recommendation | Active Guildへ人口集約 | 既存Recommendationあり | 一部独自説明 | 正本目的にない説明Copyを除去 |
| Guild Detail | 公開情報、Join/Apply | 既存公開Detail RPC/UIあり | 英語ラベル混在 | 仕様で必要な項目だけ維持 |
| Guild Join | Join/Apply→所属認知 | 成立 | 独自誘導Copyあり | System必要CTAと正本導線に限定 |
| Guild Welcome | System/Welcome Card。Master投稿に偽装しない | CardとMaster編集あり | 概ね準拠 | 独自説明を除去、既存機能維持 |
| First Chat | `[挨拶する]`で入力欄へpreset、自動送信禁止 | 成立 | 重大差異なし | Functional回帰 |
| Reply | Discord式Reply、元Message、Unread、名前Tap | 成立 | Chatタイトル/CTAに独自表現 | 一般UI/確定機能名へ限定 |

## Copy分類

### A. EXACT SPEC

- World Introduction全文
- アゲハ挨拶・名前案内・入力後Copy
- Tutorialのガチャ/編成/クエスト/時短/NPCバトルCopy
- WORLD / POWER / TRIBE各Slide本文
- `BATTLE START`、`WIN`、`LOSE`（Package/wireframe明記）

### B. EXISTING CONFIRMED COPY

- ガチャ / 編成 / クエスト / 時短 / バトル
- 新宿 / 渋谷 / 池袋 / 六本木 / 秋葉原 / 川崎 / 横浜
- TRIBE / TRIBE NEON
- CASH / ダイヤ / SSR等、確定ゲーム用語

### C. SYSTEM NECESSARY

- 次へ / 戻る / 閉じる / 確認 / 保存 / 送信 / 返信
- 通信失敗時の最小エラーと再試行
- 処理中状態（保存中、準備中等）

### D. UNSPECIFIED / CODEX GENERATED（削除・変更対象）

- `WORLD INFORMATION / NEON TOKYO`
- `NEON TOKYO / 20XX`
- `WELCOME TO NEON TOKYO`
- `BOOTING NEON TOKYO`
- `欲望が光り、力がルールになる街。`
- `ここでは、仲間との絆とあなたの決断が未来を変える。`
- `TRIBE 仲間と勢力を築く` / `BATTLE 街で生き残る力を示す`
- `ネオン東京へ`
- `ルールのない街で、何者になる？`
- `FIRST NEON DRAW` / `TUTORIAL FREE 10 PULL`
- Tutorialガチャの独自3人ヒーロー構成と独自説明
- Formation / Quest / Battle前の仕様外TutorialNavigator文
- 3 Slidesの独自要約Copy
- Mission/Home/Guild/Chatの仕様外キャッチコピー

## English Copy Audit方針

許可: TRIBE NEON、TRIBE、CASH、SSR、WORLD/POWER/TRIBE（3 Slide識別名）、BATTLE START、WIN/LOSE、HP、EXP、NPC、PvP、Raid、GvG、DM等、Packageまたは確定仕様で明示された正式名・識別名。

削除: NEON TOKYO、WORLD INFORMATION、FIRST NEON DRAW等の仕様にない英語。内部識別子はDOMへ表示しない。

## Human Decisions Required

- SSR固有一言のCharacter別正本CopyはPackageに記載がない。新規作成せず、正本Copyが提供されるまで無言の暗転・Light/Neon Presentationとする。
- Mission master由来の各タイトル/説明はDB masterを正本として表示する。M9-X Packageだけでは全mission Copyの逐語定義がないため、Codex判断で置換しない。
- Guild Welcome未設定時のDefault本文はPackageに逐語定義がない。既存server defaultを正本候補として保持し、新規Copyを作らない。

## Remediation Record

| Screen | Removed / Changed Element | Reason | Correct Spec Source |
| --- | --- | --- | --- |
| World Introduction | 下部Card、`WORLD INFORMATION / NEON TOKYO`、独自説明Box、独自CTAを除去しFull Screen化 | Packageに存在しないPresentation/Copy | Package 01 §2、Package 02 World Introduction、wireframe |
| Ageha / Name Input | 独自見出し・挨拶を除去し、World → Ageha → Nameの順序へ統一 | Package順序・逐語Copyとの不一致 | Package 01/02 §3 |
| Tutorial Gacha | 独自3人ヒーロー、`FIRST NEON DRAW`等を除去し、画像バナーと無料10連CTAへ変更 | 仕様外のVisual/英語Copy | Package 01/02 §4・§6、wireframe |
| Gacha Reveal / Result | 1〜9枠の順次Reveal、10枠目SSR専用Visual、10件Compact Resultへ統一 | PackageのReveal hierarchyへ準拠 | Package 02 Gacha Presentation |
| Formation | 独自説明とGrowth接続を除去し、確定SSR＋推奨スキルのおまかせ編成からDISPATCHへ接続 | Growthは現行Packageの必須Stepではない | Package 01 Tutorial contract / Package 02 Formation |
| Quest / Speed-Up | 独自段階Trackと説明を除去し、派遣→無料時短→Battleの正本Copyへ変更 | wireframe hierarchy・逐語Copyとの不一致 | Package 01/02 Quest / Speed-Up、wireframe |
| Battle Pre / Result | 重複Tutorial案内を除去し、既存ViewerとQuest Rewardの責務境界を維持 | 仕様外Copyと二重Presentation防止 | Package 02 Battle、既存確定Battle仕様 |
| WORLD / POWER / TRIBE | 独自要約を除去し、Package本文と3枚構成へ変更 | 正本Copyとの不一致 | Package 01/02 §5 |
| Mission Hub | RULE_GUIDE完了後に既存Mission Hubを開く | 正本遷移の欠落 | Package 01/02 Tutorial completion |
| Guild / Chat | 仕様外キャッチコピー、英語見出し、Raid誘導を除去 | Packageに存在しないCopy/CTA | Package 01 Social contract |
| Branding / Legal | `TRIBE: NEON REIGN`を正式製品名`TRIBE NEON`へ統一 | 未定義の製品名表記 | 正式Branding / Title KV |

`scripts/verify_m9x_spec_compliance.mjs`は、禁止Copy・旧Growthクライアント経路・必須Package CopyをSource scanする補助Gateである。regexのみではSpecification PASSとせず、本Matrixと375/390/430pxの目視確認を併用する。

## Gate Results (2026-08-18)

- Functional Gate: Tutorial / Cold Start / Remaining P0の統合15/15 PASS。Title/Auth/Social/NPC Practiceの追加回帰27/27 PASS。
- Specification Gate: `verify:m9x-spec` PASS（対象15 UI source、必須Package fragment 13件）。Matrixによる構造・Copy確認を併用。
- Visual Gate: Title、World、Ageha、Gacha、1〜10 Reveal、Result、Formation、Quest、Battle、Reward、Mission/Socialを375/390/430pxで確認。横overflow、CTA hierarchy、Character crop、禁止Copyの再発なし。
- Character Asset QA: Tutorial露出対象およびSSR候補を含む透過PNGを修復し、重点10件のedge green spillは0〜1 pixel。cropは`characterPresentationMetadata.ts`で個別調整可能な状態を維持。
- Loading QA: local cold start 1,319ms、boot manifest処理265ms、4/4 loaded・fallback/failed 0。BOOT_CRITICAL / TUTORIAL_CRITICAL / DEFERREDの段階ロードを維持。
- TypeScript / Production build: PASS。Production deployは未実施。
- Preview: `https://tribe-neon-mobile-preview.vercel.app`（Vercel Preview deployment `dpl_HbjnB55wY1exqdJp7FWVcKo8fo2u`）。iPhone 13 / Pixel 7 smoke PASS。

## Mission Human Acceptance Follow-up (2026-08-21)

- Mission Production Master: **PASS / FROZEN**
- Mission Runtime Integration: **PASS / CLOSED**
- Mission Automated Validation: **PASS**
- Mission PC Human Acceptance: **PASS**
- Mission Mobile Human Acceptance: **DEFERRED TO FINAL UI ACCEPTANCE**

PC Human AcceptanceでMission Master、Runtime、個別Claim、Claim Allの機能に問題がないことを確認した。以下はMission Close blockerではなく、Mission専用の再設計も行わない。

| Observed UX polish | Classification | Current action |
| --- | --- | --- |
| Claim操作から報酬獲得Dialogまで明示的なprocessing feedbackがなく、一時的にfreezeと誤認し得る | Common Async Feedback | DEFERRED NON-BLOCKER |
| 報酬獲得Dialogが既存ゲーム内ModalのVisual Contractと統一されていない | Common Reward / Result Modal Standardization | DEFERRED NON-BLOCKER |

将来の共通化対象はMission、Present、Gacha、Shop、Character Growth、Skill / Equipment Growthとし、Mission固有修正としては実装しない。390×844および412×915でのMission layout確認はFinal Cross-Screen Mobile Human Acceptanceへ統合する。clipping、操作不能、文字・報酬の判読不能、safe area、state表示欠損は最終Release blockerとし、processing feedback不足とDialog visual inconsistencyは非ブロッカーとして分離する。Mission Production Master / Runtime IntegrationはPASS / CLOSEDを維持する。
