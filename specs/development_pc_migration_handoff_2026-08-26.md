# GAME03 / TRIBE NEON — 開発PC移行・現状引継ぎ

基準日: 2026-08-26

## 1. 文書の目的と判定

本書は、GAME03 / TRIBE NEON の開発環境を旧PCから新PCへ移行した際の事実、残作業、運用境界を記録する。

- **新PCでの開発開始**: 可能
- **PC移行の完全完了**: 未完了
- **Production Release判断**: 未実施

今回のPC変更は環境移行であり、仕様変更、依存パッケージ更新、DB再設計、Architecture変更を同時に行うものではない。

## 2. Projectと正本

- Project: GAME03 / TRIBE NEON
- GitHub Repository: `kiyoshikitamura/tribe-neon`
- 旧PC Repository: `D:\dev\tribe-neon`
- 新PC Repository: `C:\Users\Kiyoshi Kitamura\Documents\Codex\2026-08-25\git\tribe-neon`
- 移行branch: `codex/migrate-msi-workspace`
- 移行PR: `https://github.com/kiyoshikitamura/tribe-neon/pull/1`

GitHub上のRepositoryと`specs/`を正本として扱う。仕様の優先順位は`specs/specification_reconciliation.md`に従い、仕様にない内容を推測で補完しない。確定仕様と提案中仕様を分離する。

## 3. 開発機の役割

### 新PC

- メイン開発機として使用する。
- GitHubを介したbranch / commit / pull / push / PR運用の起点とする。
- M9-X / Human Visual AcceptanceおよびRelease準備の残作業を再開できる。

### 旧PC

- サブ開発機として保持する。
- 現在の`D:\dev\tribe-neon`は、移行PRのmergeと新PC側の完了確認まで凍結する。
- 凍結中は確認目的の読み取り以外を行わない。
- `pull`、`reset`、ファイルを上書きする`checkout`、`clean`、`commit`、`push`、migration実行、Secret変更を行わない。
- 移行完了後は現在のRepositoryをバックアップとして保持し、GitHubから最新状態を別途cloneしてサブ開発環境を作る。
- 汚れた旧Repositoryへ最新`main`を直接pullして再利用しない。

複数PCで同じbranchを同時編集しない。未commit状態やZIPを日常的な同期の正本として扱わない。

## 4. 旧PC差分の保全と移行内容

- 転送ZIPのハッシュ一致を確認済み。
- ZIP保存時と旧PCのGit状態が一致していることを確認済み。
- 必要なローカル設定が存在することを確認済み。
- 旧PCのtracked / untracked差分を新PC上で再構築し、GitHubの後続履歴と照合済み。
- GitHubの後続履歴に存在しなかった40 Assetと2文書を移行branchへ統合済み。
  - Promotion Asset: 11点
  - BGM / SE: 29点
  - Acceptance関連文書: 2点
- PC移行を理由とする機能有効化、DB変更、Production変更は行っていない。

## 5. 開発環境

新PCで確認済みの基本構成:

- Windows
- Git `2.55.0.windows.5`
- Node.js `v22.22.3`
- npm `10.9.8`
- GitHub CLI `2.98.0`
- Supabase CLI `2.101.0`
- Vercel CLI `59.5.0`
- Codex
- ローカルNext.js開発環境

CLIの認証情報とローカル設定はRepository外に保存する。Secretや端末固有設定をGitへcommitしない。

## 6. Supabase

現行の環境構成は以下を正とする。

| 用途 | Project | Project ref | 状態 |
| --- | --- | --- | --- |
| Production | `tribe-neon-prod` | `ktpolnkyyfkowxdmijww` | 参照確認済み。PC移行による変更なし |
| Development | `tribe-neon-dev-clean` | `vosbyukxmskvisbgleug` | 新PCのローカル作業先としてlink済み |
| Preview | `tribe-neon-preview` | `sufvuqdnqohpfzkwxohq` | 参照確認済み |
| Retired | `tribe-neon-dev` | `hggzvgdrgrboxmeywebw` | 旧環境。通常運用から除外 |

取り扱い規則:

- migration、RPC、RLS、Server Authorityは既存仕様・既存実装を優先する。
- PC移行を理由とした新規migration、DB再設計、migration history修復を行わない。
- `supabase db push`、Production Data変更、Dashboardでの直接SQL実行を行わない。
- `.env.local`、DB接続情報、anon key、service role key、access token、DB passwordをcommitしない。
- `supabase/.temp/`をcommitしない。

## 7. Vercel

- Vercel CLIへのloginを確認済み。
- Vercel project `kiyoshi-kitamura/tribe-neon`へlink済み。
- Project ID: `prj_He8QAAwvfwm74FWq2Vb8BFHCbEXb`
- Organization ID: `team_ounFOJd7sfCvcytYCkExbj77`
- GitHub連携はクラウド側の既存設定を維持する。
- 移行PRへのpushにより、既存GitHub連携のVercel Preview Deploymentが自動実行され、Vercel checkの成功を確認した。手動DeploymentとProduction Deploymentは実行していない。
- `.vercel/`およびVercel認証情報をcommitしない。

## 8. AssetとArt / UI正本

主要AssetのRepository内配置:

- Character: `public/characters/`
- 透過処理前Raw Asset: `public/raw_assets/`
- Skill: `public/skills/`
- Equipment: `public/equipments/`
- Promotion: `public/promotion/`
- BGM / SE: `public/sounds/`

主要な正本文書:

- Art / Visual Identity: `specs/art_bible.md`
- Game Rule / DB / Feature: `specs/game_spec.md`および各`spec_*.md`
- 共通UI: `specs/ui_design_system.md`
- Character設定: `specs/assets_characters.md`
- 生成指定: `specs/visual_prompt_sheet.md`

タイトルは`TRIBE NEON`とする。世界・移動・クエストの拠点は新宿、渋谷、池袋、六本木、秋葉原、川崎、横浜の7拠点とする。GvG支配・Raid出現対象は別途ゲームルールの正本に従う。旧タイトル・旧Base表記はLegacy扱いとする。

## 9. 現在の開発フェーズ

現在は根幹機能の大規模な新規開発ではなく、`M9-X / Human Visual Acceptance → Production Freeze / Release準備`の工程である。

Character / Skill / Equipment / Quest / Gacha / Battle等のMaster構造をPC移行と同時に再設計しない。主な残作業はTutorial、Gacha、Formation、Quest、Battle、Character Card、World Introduction、Skill VFX、Loading、UI / Presentation、Mobile Acceptanceの品質確認と最小修正である。

Battleのauthoritative Replay contract、Server Authorityを変更しない。Client側でDamage、Target、Skill、行動順を決定しない。

## 10. 移行確認結果

| 判定項目 | 結果 | 備考 |
| --- | --- | --- |
| Repository clone | PASS | 新PC上にclone済み |
| 移行branch / GitHub同期 | PASS | `codex/migrate-msi-workspace`をpush済み |
| Local Dev Server | PASS | Next.js 16.2.10、`HTTP 200`を確認 |
| Supabase dev-clean接続 | PASS | Development refへlink済み |
| GitHub CLI認証・Repository操作 | PASS | branch push / PR作成実績あり |
| Supabase CLI認証 | PASS | 3つの現行projectを参照確認 |
| Vercel CLI認証・Project Link | PASS | 既存projectへlink済み |
| Vercel Preview Deployment | PASS | GitHub連携による自動Deployment。Human Acceptanceは未実施 |
| トップページ応答 | PASS | title `TRIBE NEON`、コンパイルエラーなし |
| Asset参照 | PASS | 移行Assetのhashとbuildを確認 |
| production creative verification | PASS | 移行統合時に実行済み |
| typecheck | PASS | 移行統合時および開発開始判定時に実行済み |
| lint | PASS WITH WARNINGS | エラー0、既存warning 1,336件。移行PRではcleanupしない |
| production build | PASS | 移行統合時および引継ぎ文書追加時に実行済み |
| `test:e2e` | PARTIAL | 100件中97件PASS、3件FAIL。下記の既存Acceptance差分を参照 |
| Codex Repository Access | PASS | 読み取り・編集・検証・Git操作可能 |
| Git作業ツリー | PASS | 引継ぎ文書追加前はclean |

## 11. 未完了・未判定項目

- 主要画面全体の人間によるVisual確認
- 実Supabase構成でのアプリ内Authentication確認
- M9-X Human Visual Acceptance完了
- `test:e2e`の残り3件
  - Presentation Harnessのscenario期待数22に対して実装25
  - Tutorial Skill impact期待時間2,100ms以上に対して実測1,657ms
  - 新規Mobile Player導線のCanvas位置期待値差
- GitHub Qualityの`verify:operations-exposure`
  - 最新`main`のHome表示と、検証スクリプトが要求する「抗争」「準備中」の同時存在が不一致
  - 移行branch作成後の`main`でも同じ失敗が継続しており、移行Asset・引継ぎ文書による回帰ではない
- Vercel Preview URL上のHuman Acceptance
- Production Release判断

E2Eの3件は本引継ぎ文書の追加による回帰ではなく、現行実装と既存Acceptance期待値の差である。移行PRへ修正を混在させず、M9-Xの別branch / 別PRで仕様と実装を照合して扱う。

上記が残っているため、「新PCで開発開始可能」と「PC移行の完全完了」を同一視しない。

## 12. Release運用計画

以下は2026-08-26時点の運用計画であり、変更可能な日程情報として扱う。

- プレオープン: 最遅2026-08-26
- 課金開始: 2026-08-31
- GvG: プレオープン期間中は非開放

日付だけを優先して品質を下げない。M9-X Acceptance完了状態をRelease判断の基準とする。

## 13. Codex運用ルール

Codexは原則として以下の順で作業する。

1. Repositoryを確認する。
2. 既存仕様を確認する。
3. 現実装を確認する。
4. 最小差分で修正する。
5. `package.json`に実在するbuild / lint / test / verificationを実行する。
6. 結果、未確認事項、影響範囲を報告する。

次を行わない。

- 新仕様の創作
- 大規模rename
- 不要なDB migration
- Server Authority変更
- Replay Contract変更
- Acceptance済みUIの全面変更
- 無関係なcleanup

仕様矛盾、DB migration、RPC / RLS変更、Server Authority変更、破壊的変更、Production Data影響が必要な場合は、実装前に停止して確認する。

## 14. 移行PRの境界

移行PRには、旧PCから保全した不足Asset、Acceptance関連文書、本引継ぎ文書、移行検証結果のみを含める。

以下は別branch / 別PRとする。

- Character Badgeの配置修正
- Battle Skill HOLD調整
- Result MVP対応
- UI / Presentation改善
- M9-X Acceptanceで発見した機能修正
- 新しいSoundの実装・接続変更
- その他の機能開発

移行PRのmerge後、新PCの最新`main`から機能単位のbranchを作成して残作業を再開する。

## 15. 移行完了条件

PC移行の完全完了は、最低限以下が成立した時点で判定する。

- 本移行PRが`main`へmergeされている。
- 新PCの最新`main`でLocal Dev Server、build、lint、typecheck、必要なtestがPASSする。
- Development接続でAuthenticationと主要画面を確認できる。
- 主要Assetを実画面で確認できる。
- Vercel Preview DeploymentとPreview AcceptanceがPASSする。
- CodexとGitHubから新しい機能branchを作成できる。
- 旧PCの凍結Repositoryを保全したまま、サブ開発用Repositoryを再cloneできる。

完了判定までは旧PCの凍結を維持する。
