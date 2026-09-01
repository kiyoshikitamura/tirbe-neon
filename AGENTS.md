# TRIBE NEON Agent Entry Point

This file is the automatically loaded entry point for coding agents. Keep it concise and route detailed work to the maintained contracts below.

## Read order

Before changing code, read:

1. The user's current instruction and named acceptance decisions.
2. `docs/development/release_board.md`.
3. `docs/development/codex_parallel_protocol.md`.
4. The assigned file under `docs/development/agent_tasks/`, when one exists.
5. The current dated specification, production-freeze document, or acceptance handoff named by the task.
6. Relevant runtime code, tests, migrations, and deployed-state evidence.

`.agents/AGENTS.md` contains historical project rules. Use only rules that do not conflict with the current task, newer dated specifications, accepted Product Owner decisions, or current runtime authority. Stop and report a specification conflict instead of choosing silently.

## Durable invariants

- The Product Owner is the final authority for product scope, visual/UX acceptance, release decisions, and specification changes.
- Repository code, migrations, and deployed evidence establish implementation facts; they do not authorize inventing missing product rules.
- Do not change Gameplay, Economy, Master values, Battle Formula, Replay Authority, Result/Reward/RNG authority, Authentication authority, RLS, or Production configuration unless the assigned scope explicitly requires it.
- Presentation work must not move server authority to the client.
- Do not expand scope, perform opportunistic refactors, or fix discovered issues without a task decision.
- `IMPLEMENTED != PASS`. `VALIDATED != HUMAN PASS`.
- Mobile visual acceptance uses `390x844` and `412x915` unless the task defines another viewport.
- Never merge, change the fixed Preview alias, deploy to Production, or mutate Production Supabase without explicit user authorization for that exact action.

## Validation baseline

Select the narrowest relevant checks from `package.json`, then run the required regression checks for the touched authority. At minimum, report lint/typecheck/build status or why a check could not run. DB work must use the repository's guarded Supabase commands and environment-target verification.

## Task Factory

For multi-item implementation, autonomous execution, parallel work, or an instruction to carry work through review and Human Acceptance, use `.agents/skills/tribe-neon-task-factory/SKILL.md` and `docs/development/task_factory.md`.
