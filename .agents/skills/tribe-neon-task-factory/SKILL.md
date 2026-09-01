---
name: tribe-neon-task-factory
description: Orchestrate TRIBE NEON implementation requests into dependency-aware isolated tasks, Draft PRs, independent reviews, mobile Before/After evidence, Human Acceptance, and explicitly authorized integration. Use for multi-item development, parallel execution, release workstreams, or requests to carry implementation through review; do not use for discussion-only planning or a single read-only audit.
---

# TRIBE NEON Task Factory

Turn the Product Owner's requested outcomes into safe, reviewable workstreams. The parent agent acts as dispatcher and integration owner; implementation workers remain scoped to one task.

## Required context

Read in order:

1. Repository-root `AGENTS.md`
2. `docs/development/release_board.md`
3. `docs/development/codex_parallel_protocol.md`
4. `docs/development/task_factory.md`
5. Each assigned task contract and its named current specification/acceptance handoff

Resolve every relative path from the repository root. If a path is unavailable, a specification conflicts, or the current `develop` SHA cannot be established, stop the affected task rather than guessing.

## Orchestration

- Resolve current branch/PR/workstream state before dispatch.
- Decompose by independently testable outcome, not by technical layer.
- Record a manifest using `docs/development/task_factory.md`.
- Acquire the shared dispatcher lock and reserve all scopes/resources through `docs/development/task_registry.yaml` on `agent/task-registry` before spawning workers.
- Persist both `docs/development/agent_tasks/<TASK-ID>.md` and `<TASK-ID>.task.yaml`, assign a concrete worker ID, and let only the parent dispatcher update the manifest with compare-and-swap semantics.
- Classify dependency, overlap, risk lane, environment need, and Human Acceptance.
- Dispatch only `PARALLEL` tasks concurrently. Keep shared-authority and overlapping work sequential.
- Require a dedicated code environment for every task and isolated mutable data for DB-writing tasks.
- Require implementer validation, a separate review context, and P0/P1 resolution.
- Bind independent review to the exact candidate SHA and invalidate it whenever the candidate changes.
- For UI/Presentation, require matched Before/After captures and a commit-bound Preview.
- Consolidate results for Product Owner judgment. Never equate implementation or machine validation with Human PASS.
- Bind Human PASS to the exact candidate/Preview SHA and invalidate it whenever either SHA changes.

## Authorization and stopping

Implementation authorization permits branches, commits, checks, Draft PRs, and evidence within scope. Merge, fixed Preview alias changes, Production deployment, and Production Supabase mutation require explicit authorization for the exact action.

Stop and report `BLOCKED` when isolation is unavailable for a mutating task, protected authority would need to change outside scope, an active workstream overlaps materially, required evidence cannot be tied to the task SHA, or a destructive/Production action lacks authorization.

## Output

Return a consolidated board with:

- task ID and status;
- parallel/sequential decision and reason;
- risk lane;
- branch, commit, and Draft PR;
- validation and independent review result;
- Preview URL plus matching SHA;
- Before/After evidence;
- Human Acceptance request;
- blockers and exact next action.
