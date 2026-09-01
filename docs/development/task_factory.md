# TRIBE NEON Task Factory

## Purpose

Convert a Product Owner instruction into isolated, reviewable implementation tasks that can run in parallel when safe and stop at Human Acceptance. This extends `codex_parallel_protocol.md`; it does not change game specifications or runtime authority.

## Authorization boundary

An instruction to implement or proceed authorizes scoped branches, commits, validation, Draft PRs, and review evidence. It does not authorize merge, fixed-alias changes, Production deployment, Production Supabase mutation, destructive migration, or release. Those require an explicit instruction naming the intended action or accepted tasks.

## Dispatch sequence

1. Resolve the current `develop` SHA and list active PRs/workstreams.
2. Translate the request into outcome-based candidate tasks.
3. Identify canonical sources, protected authorities, likely files, data dependencies, and Human Acceptance requirements.
4. Build a dependency graph and classify each task as `PARALLEL`, `SEQUENTIAL`, or `BLOCKED`.
5. Assign one branch and one execution environment per runnable task.
6. Run implementation, machine validation, independent review, and evidence collection.
7. Return a consolidated board. Do not mark a task `PASS` before all required Human Acceptance is recorded.

## Task manifest

Every dispatched task requires both:

- Human-readable contract: `docs/development/agent_tasks/<TASK-ID>.md`
- Machine-readable manifest: `docs/development/agent_tasks/<TASK-ID>.task.yaml`

The manifest references the contract. The parent dispatcher is the sole manifest writer and must update it with the current Git blob SHA as a compare-and-swap precondition. A stale write or either missing artifact blocks dispatch.

Every dispatched task must record:

```yaml
task_id: ""
manifest_path: "docs/development/agent_tasks/<TASK-ID>.task.yaml"
contract_path: "docs/development/agent_tasks/<TASK-ID>.md"
title: ""
priority: "P0 | P1 | P2"
status: "READY"
base_sha: ""
branch: ""
worker_id: ""
owner_role: "IMPLEMENTER"
risk_lane: "GREEN | YELLOW | RED"
execution: "PARALLEL | SEQUENTIAL | BLOCKED"
registry_generation: 0
reservation_state: "ACTIVE | BLOCKED_HELD | RELEASING | ARCHIVED"
scope: []
do_not_touch: []
canonical_sources: []
dependencies: []
likely_files: []
environment:
  code: "DEDICATED"
  database: "NONE | ISOLATED | READ_ONLY_SHARED"
  database_id: ""
  seed_identity: ""
  local_port: ""
  preview: "REQUIRED | NOT_REQUIRED"
acceptance:
  machine: []
  visual: []
  human_required: true
  human_status: "NOT_REQUIRED | PENDING | PASS | FAIL"
  accepted_sha: ""
  accepted_by: ""
  accepted_at: ""
review:
  required: true
  status: "PENDING | PASS | FAIL"
  reviewer_id: ""
  reviewed_sha: ""
  p0_findings: []
  p1_findings: []
  completed_at: ""
cleanup:
  status: "NOT_REQUIRED | PENDING | PASS | FAIL"
  evidence: []
  completed_at: ""
outputs:
  candidate_sha: ""
  pull_request: ""
  preview_deployment_id: ""
  preview_url: ""
  preview_sha: ""
  before_evidence: []
  after_evidence: []
```

Do not fabricate unknown fields. Mark the task `BLOCKED` when an unknown changes the implementation or authority boundary.

The dispatcher must assign a concrete `worker_id` and atomically claim the manifest before starting a worker. Workers may report results but do not mutate the canonical manifest directly. Before dispatching another task, the parent reads every active manifest from its recorded branch/path and checks worker identity, scope, likely files, authority, and external-state overlap.

Human PASS is valid only when `accepted_sha == candidate_sha == preview_sha` for Preview-backed acceptance. Independent review is valid only when `review.status == PASS`, `review.reviewed_sha == candidate_sha`, and P0/P1 findings are empty.

Any change to `candidate_sha` or `preview_sha` automatically:

- resets `human_status` and `review.status` to `PENDING`;
- clears acceptance identity and timestamp;
- clears reviewer identity, reviewed SHA, findings, and completion time;
- requires new Preview evidence, independent review, and Human Acceptance.

A generic approval or prior review must never be carried across commits.

## Shared dispatch registry

All dispatchers coordinate through one registry at `docs/development/task_registry.yaml` on the persistent `agent/task-registry` branch. This branch is a control plane and is not merged into application branches.

Before creating or starting any task, the parent dispatcher must:

1. Read the registry and its current blob SHA.
2. Acquire `dispatcher_lock` with a concrete dispatcher ID and bounded lease by compare-and-swap updating that same blob.
3. Re-read active reservations and check task IDs, scope, likely files, protected authority, ports, database IDs, seed identities, and Preview resources.
4. Add all new reservations and increment `generation` in one compare-and-swap update.
5. While still holding the lock, create and confirm every paired Task Contract and Manifest using their recorded paths and blob SHAs.
6. Re-read the registry plus every new artifact and confirm task ID, worker ID, scope, resources, and generation match.
7. Release the lock in a final compare-and-swap registry update.
8. Spawn workers only after the lock-release commit is visible.

Only the lock holder may create or update Task Contracts and Manifests. Workers may be dispatched only after the lock holder has confirmed the artifacts and safely released the lock. If artifact creation or confirmation fails, the lock holder must record the affected reservation as `BLOCKED` with the partial artifact identities, then release the lock; it must not spawn the worker or delete an unverified resource.

A missing registry branch, active unexpired lock, stale blob SHA, or conflicting reservation blocks dispatch. Expired locks may be replaced only after recording the prior dispatcher and expiry in the registry history. The registry is bootstrapped once from `docs/development/task_registry.yaml`; recreating or resetting it requires explicit infrastructure-maintenance authorization.

### Reservation completion

Reservations are not removed merely because implementation or review finished. For a terminal task state, the parent dispatcher must:

1. Acquire the shared registry lock by compare-and-swap.
2. Verify the active reservation's task ID, worker ID, branch, and `registry_generation`.
3. Verify required environment cleanup from the manifest, or `cleanup.status: NOT_REQUIRED`.
4. Set the reservation to `RELEASING`.
5. In one compare-and-swap update, append a history entry with final task status, final/candidate commit, cleanup evidence, worker, dispatcher, and completion time; remove the exact reservation from `active_tasks`; and increment `generation`.
6. Confirm the archive/removal commit, set the manifest reservation state to `ARCHIVED`, and release the registry lock.

`MERGED`, `CLOSED`, and `OMITTED` are terminal for reservation purposes only after cleanup verification. A temporary `BLOCKED` task uses `BLOCKED_HELD` and retains its reservations. A permanently abandoned `BLOCKED` task may be archived only after the Product Owner or authorized dispatcher records the abandonment decision and cleanup evidence. Failed cleanup keeps the reservation active and blocks overlapping dispatch.

## Parallel-safety rules

Tasks may run in parallel only when all are true:

- Their intended outcomes and acceptance criteria are independent.
- Their likely files and canonical Source of Truth do not overlap materially.
- They do not share mutable external state.
- They do not both touch a High Risk Shared Area.
- Their merge order cannot change either result.

Use sequential execution when tasks share a component, migration chain, canonical master, tutorial state machine, Battle contract, or integration test baseline. Environment isolation does not make semantically overlapping tasks safe to merge concurrently.

## Risk lanes

### GREEN

Presentation, copy, isolated UI, fixtures, and non-authoritative QA changes. Human PASS plus machine gates can authorize integration only when the user explicitly names the accepted task or PR and instructs the agent to merge it.

### YELLOW

Edge Functions, RLS, additive migrations, authentication flow, rewards, or shared state. Require an isolated DB or deterministic disposable local Supabase, migration verification, rollback/forward-fix notes, and independent review before Human Acceptance.

### RED

Payments, destructive migrations, Production configuration, Battle/Replay/Result authority, RNG, canonical Master authority, or irreversible data operations. Do not dispatch in parallel. Require a task-specific plan and explicit Product Owner authorization before implementation and again before Production mutation when applicable.

## Environment contract

- Code: every task uses a dedicated Codex cloud container or Git worktree based on an immutable `base_sha`.
- Port: allocate a task-specific port when a local preview is used; never terminate an unknown process to claim a port.
- Database: DB-writing tasks require a disposable isolated Supabase branch/stack. Record its concrete branch, project, or local-stack identifier in `database_id`; the value `ISOLATED` alone is insufficient. If no concrete isolated identity can be allocated, stop before mutation. Shared Preview may be used only for explicitly read-only verification or a single serialized acceptance task.
- Preview: bind the Preview deployment to the task branch and its intended data environment. Record deployment ID, candidate commit SHA, Preview commit SHA, and URL together; acceptance evidence is invalid when these do not identify the same candidate.
- Seed users: use task-specific test identities or namespaces. Do not reuse paid, production, or another task's acceptance user.
- Cleanup: cleanup must be explicit and target only resources recorded in the task manifest. Never infer targets from broad globs or environment variables.

## Autonomous review loop

The implementer repeats edit and validation until the assigned checks pass or a stop condition is reached. A separate review context then checks the diff against the task contract and repository rules. P0/P1 findings return to the implementer; the loop stops when they are resolved, rejected with evidence, or blocked by a Product Owner decision.

Automatic GitHub review can supplement this loop but does not replace task-specific runtime, migration, or Human Acceptance evidence.

Record the reviewer, findings, completion time, and exact reviewed candidate SHA in the canonical manifest. A review of any earlier SHA is stale.

## Evidence contract

UI and Presentation tasks must provide:

- design intent and the observable behavior changed;
- matched Before/After evidence at `390x844` and `412x915`, or a documented reason a viewport is not applicable;
- the same route, fixture, state, and capture timing for each comparison;
- a task Preview URL and its commit SHA;
- interaction checks for loading, repeated taps, navigation/back behavior, overflow, and relevant error states.

After-only evidence is insufficient when a visual or interaction change is claimed.

## Integration command

Require an explicit merge instruction such as `Task Aをdevelopへmergeして` or `PR #123をmergeして`. A generic approval such as `OK` or `反映して` is Human Acceptance, not merge authorization. Before merging, verify:

- exact PR and accepted commit SHA;
- current Human Acceptance record, including `human_status: PASS`, `accepted_sha`, approver, and timestamp;
- current independent review record with `review.status: PASS`, `reviewed_sha == candidate_sha`, and no unresolved P0/P1 finding;
- CI and required targeted checks pass;
- latest `develop` is integrated and checks rerun;
- the final Preview corresponds to the post-integration candidate SHA;
- migration and rollback/forward-fix conditions are satisfied;
- the requested action does not imply an unapproved Production mutation.

If the accepted task cannot be identified unambiguously, ask which task to integrate.

## Consolidated handoff

Return one compact board containing task ID, status, risk lane, branch/PR, validation, Preview, Human Acceptance need, blocker, and merge recommendation. The Product Owner should be able to judge specification intent, Before/After evidence, and real-device behavior without reading code.
