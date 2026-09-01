# Agent Tasks

このDirectoryは、Codex Workerへ割り当てるTask Contractを管理する。各Workerは原則1つのTask Scopeだけを担当し、Assigned Scope外へ拡張してはならない。

## Common start procedure

```text
READ CANONICAL
↓
READ RELEASE BOARD
↓
READ ASSIGNED TASK
↓
CHECK DEPENDENCY
↓
CHECK FILE OVERLAP
↓
IMPLEMENT
↓
VALIDATE
↓
REPORT
↓
WAIT FOR MAIN AGENT MERGE GATE
```

具体的には、開始前に必ず次を読む。

1. Repository root `AGENTS.md`
2. `docs/development/release_board.md`
3. 自分に割り当てられた `docs/development/agent_tasks/<TASK>.md`

続いて、Task Contractの`DEPENDENCIES`、Active Workstreamsとのfile overlap、High Risk Shared Areaへの影響を確認する。同一ファイルを別Workerも変更する可能性がある場合は、実装前にMain AI Agentへ報告する。

## Worker rules

- Codex Worker自身によるScope Expansionは禁止。
- Assigned Scope外のclean-up / refactorは禁止。
- 別問題を発見しても修正せず、`DISCOVERED ISSUES`として報告する。
- Acceptance成立に不可欠な問題だけをMain AI AgentへEscalationする。
- `IMPLEMENTED != PASS`。
- `VALIDATED != HUMAN PASS`。
- Main AI AgentのMerge Gate確認前にTaskを`CLOSED`にしない。

詳細なRole、Status、Parallel Safety、Completion Report、およびMerge Gateは `docs/development/codex_parallel_protocol.md` に従う。

## Required Task Contract fields

すべてのTaskに次を含める。

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

## Completion Report

最終出力は次の形式に固定する。

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
