# Codex Parallel Protocol

## Purpose

このProtocolは、TRIBE NEON RepositoryでMain AI AgentがRelease Manager / Integration Ownerとして複数Codex Workerを安全に並走管理するための開発管理ルールを定義する。

Repository root `AGENTS.md`をAgent運用のCanonical entry pointとする。本Protocolは同ファイルから参照される現行仕様、Task Contract、およびRepository evidenceに従い、Gameplay / Economy / Master / Battle Authorityを含む既存仕様を変更しない。`.agents/AGENTS.md`はhistorical guidanceであり、単独のCanonicalとして扱わない。

## Canonical precedence

矛盾または不明点がある場合、Codex Workerは独自解釈で実装せず、作業を停止してMain AI AgentへEscalationする。仕様変更の最終AuthorityはProduct Ownerにある。

## Roles

### Product Owner / Human Acceptance

- Product priority決定
- Release判断
- Human Visual / UX Acceptance
- 仕様変更の最終Authority

### Main AI Agent

Role:

- Release Manager
- Integration Owner
- Task Dispatcher
- Merge Gate Owner

Responsibilities:

- Task decomposition
- P0 / P1 / P2 priority
- Dependency analysis
- Parallel execution decision
- Scope boundary definition
- Conflict detection
- Merge order
- Validation review
- Human Acceptance handoff
- Release Gate recommendation

Codex Workerの「実装完了」を自動的にPASSとして扱わない。`IMPLEMENTED` は実装報告であり、Main AI AgentのMerge Gateおよび必要なHuman Acceptanceを代替しない。

### Codex Worker

各Codex Workerは原則として1つのTask Scopeだけを担当する。

開始前に、必ず次の順で読むこと。

1. Repository root `AGENTS.md`
2. `docs/development/release_board.md`
3. 自分に割り当てられた `docs/development/agent_tasks/<TASK>.md`

いずれかが存在しない、読めない、または内容が矛盾する場合は実装を開始せず、Main AI Agentへ報告する。

## Priority

- `P0`: Releaseまたは運用を即時停止する最優先事項
- `P1`: Release Gateに影響する重要事項
- `P2`: Release blockerではない改善事項

Priorityの決定・変更はMain AI Agentが管理し、最終的なProduct priorityはProduct Ownerが決定する。

## Task Contract

すべてのTaskは、実装開始前に次の項目を明記しなければならない。

- `TASK ID`
- `OWNER`
- `PRIORITY`
- `STATUS`
- `SCOPE`
- `DO NOT TOUCH`
- `DEPENDENCIES`
- `ACCEPTANCE CRITERIA`
- `VALIDATION`
- `EXPECTED OUTPUT`
- `BRANCH`
- `COMMIT`
- `BLOCKERS`

Codex Worker自身によるScope Expansionを禁止する。Assigned Scope外の問題を発見した場合は修正せず、Completion Reportの `DISCOVERED ISSUES` に記録する。

Acceptance成立に不可欠な問題である場合に限り、Main AI AgentへEscalationし、Scope変更または追加Taskの判断を待つ。EscalationはScope Expansionの許可を意味しない。

## Status

使用可能なStatusは次に固定する。

- `READY`
- `IN_PROGRESS`
- `BLOCKED`
- `IMPLEMENTED`
- `VALIDATED`
- `HUMAN_ACCEPTANCE`
- `PASS`
- `FAIL`
- `MERGED`
- `CLOSED`
- `OMITTED`

Statusの意味:

- `READY`: Contractと開始条件が整い、着手可能
- `IN_PROGRESS`: Assigned Scope内で実装中
- `BLOCKED`: 外部判断、依存関係、または解消権限のない問題により進行不能
- `IMPLEMENTED`: Scope内の実装は完了したが、PASSではない
- `VALIDATED`: 定義済みのMachine Validationを通過したが、Human PASSではない
- `HUMAN_ACCEPTANCE`: Human Visual / UX Acceptance待ち、または実施中
- `PASS`: 必須Acceptanceをすべて通過
- `FAIL`: Acceptanceを満たしていない
- `MERGED`: Merge Gate通過後に統合済み
- `CLOSED`: Main AI Agentが全完了条件を確認して終了
- `OMITTED`: Release Scopeから意図的に除外

重要:

```text
IMPLEMENTED != PASS
VALIDATED != HUMAN PASS
```

Codex WorkerはMain AI Agent確認前にTaskを`CLOSED`へ変更してはならない。

## Parallel Safety

Release Critical期間では、原則として最大4 workstreamまでとする。Main AI Agentは依存関係、担当Scope、変更候補ファイル、およびMerge順を確認してからSlotを割り当てる。

次をHigh Risk Shared Areaとして扱う。

- Battle Formula
- Replay Authority
- Canonical Master
- Authentication Authority
- DB Migration
- Production Environment Configuration
- Shared global state

High Risk Shared Areaを複数Codex Workerが同時変更することを禁止する。High Risk Shared Areaの変更が必要になった場合、Workerは変更前にMain AI AgentへEscalationし、排他的な担当とMerge順の指示を待つ。

同一ファイルを変更する可能性が判明した場合は、変更を継続せずMain AI Agentへ報告する。Assigned Scope外のclean-up、refactor、formatting、およびついで修正を禁止する。

## Dependency and overlap check

Codex Workerは実装前に次を確認する。

1. Task Contractの依存関係が満たされているか
2. Active Workstreamsと変更候補ファイルが重複しないか
3. High Risk Shared Areaに触れないか
4. 自分のBranchとCommit記録先が明確か

不明または競合がある場合は`BLOCKED`としてMain AI Agentへ報告し、判断を待つ。

## Codex Completion Report

全Codex Workerは最終出力を次の形式に固定する。項目の省略、名称変更、複数の`NEXT RECOMMENDATION`を禁止する。

```text
TASK ID:
STATUS: IMPLEMENTED / VALIDATED / BLOCKED / PARTIAL
CHANGED:
- file
WHAT CHANGED:
- summary
VALIDATION:
- command / QA route
- result
ACCEPTANCE CRITERIA:
- criterion: PASS / FAIL
NOT CHANGED:
- protected area
DISCOVERED ISSUES:
- none / issue
BLOCKERS:
- none / blocker
BRANCH:
COMMIT:
MERGE RISK:
- LOW / MEDIUM / HIGH
- reason
NEXT RECOMMENDATION:
- exactly one recommended next action
```

`PARTIAL`はCompletion Report用の報告結果であり、Task Statusではない。部分実装時のTask StatusはMain AI Agentが状況に応じて`IN_PROGRESS`または`BLOCKED`として管理する。

## Main Agent Merge Gate

Main AI Agentはmerge前に必ず次を確認する。

- Scope compliance
- `DO NOT TOUCH` compliance
- Dependency state
- Automated validation
- Regression risk
- Overlap with active workstreams
- Human Acceptance requirement

Main AI AgentはCompletion Report、diff、validation結果、および必要なHuman Acceptanceを確認し、Merge可否とMerge順を判断する。Human Acceptance必須TaskはHuman PASS前に`PASS`としない。

TaskはMain AI Agent確認前に`CLOSED`にしない。通常の進行は次のGateを使用する。

```text
IMPLEMENTED
→ VALIDATED
→ HUMAN_ACCEPTANCE（必要な場合）
→ PASS
→ MERGED
→ CLOSED
```

## Release Gate

Main AI Agentは各TaskのStatus、依存関係、validation、Human Acceptance、および未解決blockerに基づいてRelease Gate recommendationを作成する。最終Release判断はProduct Ownerが行う。
