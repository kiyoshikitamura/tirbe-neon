# BATTLE-PRES-V2

**TASK ID:** BATTLE-PRES-V2  
**OWNER:** CODEX-BATTLE  
**PRIORITY:** P1 / PRE-OPEN BLOCKER  
**STATUS:** READY

## Current Acceptance State

**Canonical Master Runtime Acceptance:** COMPLETE

**Battle Full Skill Load Stress Human Acceptance:** HUMAN FAIL — P1

## SCOPE

Canonical Replayを変更せず、次の因果関係をHumanが追跡できるBattle Presentationへ修正する。

- Actor
- Target
- Attack
- Impact
- Damage
- HP Transition
- Defeat

特にSkill高負荷時のreadabilityをAcceptance対象とする。担当範囲はBattle Presentationの視認性、表示順序、タイミング、視覚的な因果関係の改善に限定する。

## DO NOT TOUCH

- Battle Formula
- Replay Authority
- Canonical Master
- Damage authority
- Target authority
- Battle Result authority
- Gameplay / Economy仕様
- Battle Formula / Replay Authority / Masterの再設計
- Assigned Scope外のclean-up / refactor

## DEPENDENCIES

- Canonical Master Runtime Acceptanceが`COMPLETE`であること
- Canonical Replayを入力Authorityとして維持すること
- Main AI Agentによるactive workstreamのfile overlap確認
- Human Acceptance環境とhigh Skill load stress QA routeが利用可能であること

## ACCEPTANCE CRITERIA

- Canonical Replayの内容およびAuthorityを変更していない
- 通常負荷時にActor → Target → Attack → Impact → Damage → HP Transition → DefeatをHumanが追跡できる
- high Skill load時にも上記の因果関係をHumanが追跡できる
- Damage、Target、Battle ResultのauthorityをPresentation側へ移していない
- 既存のCanonical Master Runtime Acceptanceを後退させていない
- Machine Validationを通過する
- Battle Full Skill Load Stress Human AcceptanceでHuman PASSを得る

## VALIDATION

- Repository既定のBattle関連automated test / lint / typecheckを実行する
- Canonical Replay同一入力に対するBattle Resultの不変性を確認する
- 通常Skill loadのPresentation QAを実施する
- full Skill load stressのPresentation QAを実施する
- Actor、Target、Attack、Impact、Damage、HP Transition、Defeatの追跡結果をHuman Acceptanceへhandoffする

Validation commandとQA routeはRepository監査後に特定し、Completion Reportへ実行結果とともに記録する。推測したcommandで既存stateを変更しない。

## EXPECTED OUTPUT

- Assigned Scope内のBattle Presentation実装差分
- Machine Validation結果
- full Skill load stress QA evidence
- 固定形式のCodex Completion Report
- Human Acceptance handoffに必要な確認手順

## BRANCH

Main AI Agentが割り当てる。未割り当てのまま実装を開始しない。

## COMMIT

未作成。実装後、Main AI Agentの指示に従って記録する。

## BLOCKERS

- 現時点で既知の実装blockerなし
- file overlap、Canonical Replayへの変更要求、またはHigh Risk Shared Areaへの変更が必要になった場合は直ちに`BLOCKED`としてMain AI AgentへEscalationする
