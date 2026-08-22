# Quest Gameplay v2 Production Freeze — 2026-08-22

Status: **PRODUCTION FROZEN**
Authority Gap: **0**

## Progression

- Fresh User: all seven Town EASY quests are open.
- A Town's EASY First Clear unlocks that Town's NORMAL quest.
- A Town's NORMAL First Clear unlocks that Town's HARD quest.
- There is no cross-Town prerequisite or User Level lock.
- Existing `user_quest_first_clears` is the authoritative, exactly-once ledger.

## Encounter contract

| Difficulty | Party | Skills per Character | Initial tuning |
|---|---:|---:|---|
| EASY | 3 | 1–2 | Lv5 / Awakening +0 |
| NORMAL | 5 | 2 | Lv11–12 / Awakening +0 |
| HARD | 5 | 3 | Town-specific Lv16–24 / Awakening +0–+1 |

Enemy Equipment is `NONE`. Level and Awakening values are `P0_TUNABLE`; composition, Canonical references, unlock structure, and party sizes are frozen. Normal Attack remains the Canonical 80% ATK fallback and is not an Encounter loadout substitute.

## Server-authoritative tactics

- BALANCED: Shinjuku, Ikebukuro, Yokohama
- ATTACK_PRIORITY: Shibuya, Kawasaki
- SKILL_PRIORITY: Roppongi, Akihabara

Player tactic and Enemy tactic are independent Battle inputs. The Enemy tactic is stored in the Encounter Master, projected into the Replay session, and executed by the shared Canonical Battle Runtime.

## Coverage and learning

- Character showcase: 60 / 60
- SSR showcase: 10 / 10 (as part of the 60-character coverage)
- Skill showcase: 70 / 70
- EASY introduces basic damage, support, shield/heal and isolated status mechanics.
- NORMAL introduces Attribute, sustain, taunt, control, counter, cleanse, AoE and DoT.
- HARD combines Battle Start, reactive effects, layered control, counter synergy, cleanse, sustain and burst.

## Simulation Gate

Canonical Runtime, deterministic seeds, and three party profiles are used. Required shape:

- Fresh-like party wins EASY at high probability.
- Recommended party wins NORMAL reliably.
- HARD rejects an under-grown Fresh-like party but remains clearable by the recommended party and Formation.
- Overpowered party wins reliably.
- No no-damage battle, dominant one-round wipe, uncontrolled sustain, or nondeterministic result.

## Frozen dependencies

Quest IDs, 7 Town / 21 Quest structure, Duration, Vitality, User EXP, CASH, Drop Pools, Rare Drops, First Clear rewards, Skip, Mission, Reward Supply, Replay schema, Battle Presentation, PvP and Raid are unchanged.

Simplification audit: `IMPLEMENTATION_SHORTCUT_WITH_UX_COST = 0`. EASY's three-member party is an `INTENTIONAL_PRODUCT_SIMPLIFICATION` for first-session cognitive load.
