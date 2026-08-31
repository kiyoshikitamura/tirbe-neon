# LOGIN-BONUS-UX

**TASK ID:** LOGIN-BONUS-UX  
**OWNER:** CODEX-LOGIN-BONUS  
**PRIORITY:** P1 / PRE-OPEN BLOCKER  
**STATUS:** READY

## SCOPE

既存実装とCanonical reward masterを最初に監査し、Login Bonusをユーザーが認知でき、今日の獲得内容と翌日以降のReward Scheduleを理解できるmobile-first UXへ改善する。

担当範囲は既存Authorityから取得したLogin Bonus情報のPresentationとUser Journeyに限定する。仕様にないReward値を生成しない。

## DO NOT TOUCH

- Economy値
- Canonical reward masterの値、構造、Authority
- Authentication Authority
- DB Migration
- Gameplay仕様
- 仕様にないReward値の追加または推測
- Assigned Scope外のclean-up / refactor

## DEPENDENCIES

- 既存Login Bonus実装の監査
- Canonical reward masterと参照経路の特定
- Main AI Agentによるactive workstreamのfile overlap確認
- mobile viewportでのQA環境
- Human Visual / UX Acceptanceの実施可能性

## ACCEPTANCE CRITERIA

- Login Bonus獲得をユーザーが認知できる
- 今日何を受け取ったか分かる
- 翌日以降の報酬が分かる
- 再訪理由として機能する
- reward masterのAuthorityを変更しない
- mobile firstで成立する
- 仕様にないReward値を生成しない
- 既存の受取処理とreward data sourceを後退させない

## VALIDATION

- Repository既定のLogin Bonus関連automated test / lint / typecheckを実行する
- 既存Masterと表示内容の一致を確認する
- 当日受取済み / 未受取の双方をQAする
- 翌日以降のReward Schedule表示をQAする
- mobile viewportで主要導線、可読性、overflow、tap targetをQAする
- Human Visual / UX Acceptanceへhandoffする

Validation commandとQA routeは既存実装・Master監査後に特定し、Completion Reportへ実行結果とともに記録する。

## EXPECTED OUTPUT

- 既存実装・Canonical reward master監査結果
- Assigned Scope内のLogin Bonus UX実装差分
- Machine Validationおよびmobile QA結果
- 固定形式のCodex Completion Report
- Human Acceptance handoffに必要な確認手順

## BRANCH

Main AI Agentが割り当てる。未割り当てのまま実装を開始しない。

## COMMIT

未作成。実装後、Main AI Agentの指示に従って記録する。

## BLOCKERS

- 現時点で既知の実装blockerなし
- Canonical reward masterが不明、仕様とMasterが矛盾、またはfile overlapがある場合は実装を停止し、Main AI AgentへEscalationする
