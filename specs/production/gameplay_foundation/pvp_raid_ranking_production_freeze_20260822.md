# PvP / Raid / Ranking Production Freeze — 2026-08-22

Status: **PRODUCTION FREEZE PASS / CLOSED**

## PvP

- Practice: cost/reward/rating/ranking/mission impact are all zero.
- Official: PvP Point 1, authoritative defense snapshot, CASH 500 win / CASH 250 loss.
- Rating is simplified Elo: initial 1000, floor 0, scale 400, win K=32, loss K=16.
- Monthly JST calendar season. Soft reset is `1000 + floor((old - 1000) * 0.5)`.
- Matchmaking returns up to five selectable opponents through three deterministic fallback tiers: ±300 and 70–140% power, ±500 and 50–180%, then unrestricted. Self and invalid defense snapshots are excluded. No bot fallback.
- Monthly ranking rewards use CASH and `NORMAL_GACHA_TICKET_CHARACTER` only.

## Raid

- Five Raid towns: Shinjuku, Shibuya, Ikebukuro, Roppongi, Akihabara.
- Two towns are active for 24 hours. All ten town pairs rotate deterministically at 00:00 JST.
- Five independent canonical Boss profiles are derived from the Production Character Lv30 population median. Awakening is +0 and equipment is none.
- Boss HP is the average damage from 20 deterministic Canonical Battle Runtime seeds multiplied by 40 finalized battles and rounded to 100,000. Values are P0_TUNABLE; derivation and seeds remain machine-verifiable.
- Every Boss has Normal Attack 80% and at least one profile skill made only from existing Canonical effects.
- Personal contribution is authoritative damage. Guild attribution is the battle-start Guild snapshot and never moves after transfer.
- Guild ranking rewards require membership at instance end and at least one contribution attributed to that Guild.
- Participation, active participation, five-point participation, clear, personal ranking, and Guild ranking rewards are present-delivered exactly once.

## Ranking

- PvP, Raid Personal, and Raid Guild use competition rank. Equal score has equal displayed rank (`1,2,2,4`).
- Stable pagination ordering is score DESC, achieved_at ASC, stable ID ASC; tie-break fields do not alter displayed rank.
- APIs support limit, offset, and self rank.

## Compatibility and exclusions

- Existing ownership, rating, defense deck, history, Raid contribution, instance, and claim data are preserved.
- AP, Random Option, legacy Growth, rarity multiplier, Friend Helper, and Guild Combat Buff are excluded.
- `BOSS_001`, random Raid rotation, old attempt pricing, old PvP reward/delta, and fixed-100 ranking are inactive Production Gameplay.
- Replay schema and Battle Presentation are unchanged.
- Production and Preview are not applied. Development physical migration history remains reconciliation-deferred.

Authority Gap: **0**
