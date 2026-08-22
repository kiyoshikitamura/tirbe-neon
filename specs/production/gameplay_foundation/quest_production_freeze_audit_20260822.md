# Quest / Patrol Production Freeze — 2026-08-22

Status: **PASS / CLOSED**

## Canonical Machine Masters

- `src/domain/gameplay/canonical/data/quests_20260822.json`
- `src/domain/gameplay/canonical/data/quest_encounters_20260822.json`
- `src/domain/gameplay/canonical/quests.ts`

The Production master contains seven Towns and 21 stable Quest IDs (`q_<town>_1/2/3`). All 21 are Production-enabled and available to a Fresh User. Town, Difficulty, User Level, currency, and prerequisite locks do not exist; every `unlockCondition` is `NONE`. Tutorial CTA guidance does not lock other Quests.

## Frozen Quest Contract

| Difficulty | Duration | Vitality | User EXP | CASH | Character EXP expected | Equipment EXP expected |
|---|---:|---:|---:|---:|---:|---:|
| EASY | 60 sec | 5 | 100 | 300 | 590 | 720 |
| NORMAL | 180 sec | 10 | 180 | 700 | 1,200 | 1,900 |
| HARD | 300 sec | 15 | 300 | 1,300 | 3,000 | 3,750 |

NORMAL/HARD Rare Drops are `SKILL_MANUAL` at 1%/3% and `EQUIP_LB_PART` at 2%/5%. EASY has no Rare Drop. `AWAKENING_BOOK` is not a normal Quest drop.

First Clear is server-authoritative and exactly once:

- EASY: User EXP +100, `CHAR_EXP_M` x1, `EQUIP_EXP_M` x1
- NORMAL: User EXP +120, `CHAR_EXP_L` x1, `EQUIP_EXP_L` x1
- HARD: User EXP +200, `CHAR_EXP_L` x2, `EQUIP_EXP_L` x2, `EQUIP_LB_PART` x1

Skip contract: five free instant completions and ten paid instant completions per JST day, paid price 30 Diamond per use. Tutorial free instant entitlement is separate. Skip consumes normal Vitality and uses the same reward contract.

## Canonical NPC Encounter Contract

Quest encounters reuse Canonical Production Characters and the shared authoritative Battle Runtime. Each Town selects the first five hometown-matching Characters in stable Canonical Character ID order; rarity is not a priority. The same five are used at each Difficulty.

| Difficulty | NPC Level | Awakening | Party |
|---|---:|---:|---:|
| EASY | 5 | +0 | 5 Canonical Characters |
| NORMAL | 10 | +0 | 5 Canonical Characters |
| HARD | 15 | +0 | 5 Canonical Characters |

Equipment, Random Options, AP, Friend Helper, and Guild Combat Buff are absent. NPC Skill loadout is initially empty; the shared Canonical Normal Attack is 80% ATK. Character stat values are not duplicated in the encounter master and are calculated from the Canonical Character snapshot. Levels 5/10/15 are `P0_TUNABLE`; the structure is frozen.

Legacy `npc_basic_attack` 100%, Growth Pattern, rarity multiplier, additive Awakening, and independent enemy stat blocks are not used by the Production Quest snapshot. Dedicated enemy graphics remain deferred; existing Production Character assets are reused. No sound or image asset was created.

## DB / Runtime

- `20260822000181_quest_production_foundation.sql`: versioned Quest, reward pool, encounter, first-clear, skip, snapshot, replay, and reward authority.
- `20260822000182_quest_master_read_policies.sql`: authenticated read projection for Canonical Quest masters.
- `20260822000183_retire_legacy_quest_speedup_rpc.sql`: disables the superseded unlimited pre-open speed-up RPC.

Development physical schema only: 00181–00183 applied, migration history pending under `MIGRATION_HISTORY_RECONCILIATION_DEFERRED`. Production and Preview were not changed.

Server `canonical_quest_enemy_snapshot()` constructs five Canonical NPC units and `create_patrol_battle_replay()` stores the authoritative player/enemy snapshot. Reward rolls, First Clear, User EXP, CASH, Item delivery, duplicate rejection, and Mission progress remain server-authoritative. Existing Quest IDs and completed/first-clear history are preserved; completed historical patrols are backfilled into the first-clear ledger without reward reissue.

## Supply / UI / Acceptance

Quest supply is `FROZEN` in the Canonical Reward Supply master. Login and Mission supply are unchanged. The existing Quest hierarchy is retained; Town, Difficulty, Duration, Vitality, User EXP, CASH, major drops, and First Clear are projected from Canonical data. All 21 quests are usable and no LOCK state is introduced.

Development parity and E2E validate 21 Quests, 21 encounters, all unlock `NONE`, EASY/NORMAL/HARD start, 5/10/15 Vitality, 60/180/300 seconds, Canonical five-unit NPC snapshots, 80% Normal Attack, Battle resolution, reward rolls, First Clear exactly once, repeat clear, duplicate rejection, and QA fixture cleanup.

Authority Gap: **0**.
