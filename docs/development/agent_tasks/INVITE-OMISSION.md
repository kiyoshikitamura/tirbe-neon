# INVITE-OMISSION

**TASK ID:** INVITE-OMISSION  
**OWNER:** CODEX-INVITE  
**PRIORITY:** P1  
**STATUS:** READY

## Release Decision

**Friend Invitation:** PRE-OPEN OMIT

post-release / before full releaseで復活可能な状態を維持する。

## SCOPE

Pre-Open User Journey上からInvitation CTAおよび未完成または実質利用不能なInvitation導線を除外する。

確認対象:

- Entry
- My Page
- Mission
- Community
- Settings
- Invite URL
- Invite Code
- CTA
- dead navigation
- copy
- onboarding dependency

OmitはPresentationとPre-Open User Journeyからの除外として実施し、Invitation systemそのものの削除を目的としない。

## DO NOT TOUCH

- Invitation関連DB
- Invitation関連RPC
- 復活に必要なexisting implementation
- DB Migrationおよびmigration rollback
- Authentication Authority
- Gameplay / Economy / Master仕様
- 将来復旧可能性を損なう破壊的変更
- Assigned Scope外のclean-up / refactor

## DEPENDENCIES

- 既存Invitation entry pointとnavigationの監査
- Mission、onboarding、および関連copyへの依存関係確認
- Main AI Agentによるactive workstreamのfile overlap確認
- Pre-Open User JourneyのCanonical route確認

## ACCEPTANCE CRITERIA

- Pre-Open User Journey上にInvitation CTAが露出しない
- Entry、My Page、Mission、Community、Settingsからdead navigationへ到達しない
- Invite URL / Invite Codeへの利用不能な導線が露出しない
- Invitation前提のcopyまたはonboarding blockerが残らない
- Invitation関連DB / RPC / existing implementationをOmit目的で削除していない
- DB破壊・migration rollbackを行っていない
- post-release / before full releaseで復活可能な状態を維持している
- Invitation以外のUser Journeyを後退させていない

## VALIDATION

- Repository既定のnavigation / UI関連automated test / lint / typecheckを実行する
- 確認対象すべてについてInvitation CTA、copy、link、dead navigationを監査する
- Pre-Open User JourneyをEntryから主要routeまでQAする
- Invitation以外のMission / Community / Settings導線をregression QAする
- DB / RPC / migrationに破壊的差分がないことをdiffで確認する

Validation commandとQA routeはRepository監査後に特定し、Completion Reportへ実行結果とともに記録する。

## EXPECTED OUTPUT

- Invitation entry pointおよびdependency監査結果
- Assigned Scope内のOmission実装差分
- Machine ValidationとPre-Open User Journey QA結果
- 復活可能性を維持していることの確認
- 固定形式のCodex Completion Report

## BRANCH

Main AI Agentが割り当てる。未割り当てのまま実装を開始しない。

## COMMIT

未作成。実装後、Main AI Agentの指示に従って記録する。

## BLOCKERS

- 現時点で既知の実装blockerなし
- Invitation除外がDB / RPC削除を要求する、onboardingがInvitationに強く依存する、またはfile overlapがある場合は実装を停止し、Main AI AgentへEscalationする
