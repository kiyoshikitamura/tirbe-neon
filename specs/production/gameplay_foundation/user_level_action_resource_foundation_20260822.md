# User Level / Vitality / Action Resource Foundation — 2026-08-22

Status: `USER LEVEL / ACTION RESOURCE PRODUCTION FREEZE PASS / CLOSED`

## Frozen authority

- User Lv1→8 required EXP: `100 / 150 / 200 / 250 / 300 / 350 / 400` (cumulative `1,750`).
- User Lv9→100 follows `round50(600 + 100x + 25x²)`, where `x = current level - 8` and exact 25 ties round down.
- User Level cap: Lv100. Lv100 `requiredExp = 0`; additional EXP does not level up and progress is represented as 0.
- Reference cumulative EXP: Lv10 `3,050`; Lv20 `28,050`; Lv30 `120,550`; Lv50 `708,050`; Lv75 `2,712,750`; Lv100 `6,858,050`.
- Guild creation unlock: User Lv8; cost: CASH 5,000.
- Vitality: natural max 100, hard cap 500, +1 per 6 minutes.
- ENERGY_DRINK: +50. Use is rejected without consumption when the result would exceed 500.
- Quest Vitality: EASY 5, NORMAL 10, HARD 15.
- PvP Point: max 5, Official cost 1, Practice cost 0, +1 per 2 hours.
- Raid Point: max 5, entry cost 1, first-ever entry cost 0, +1 per 2 hours.
- `PVP_POINT_TICKET` (ファイトチケット): PvP Point +1; max-state use is rejected without consumption.
- `RAID_POINT_TICKET` (レイドチケット): Raid Point +1; max-state use is rejected without consumption.
- Action resources recover by elapsed time and do not reset at midnight.

## Existing-user policy

The migration does not rewrite `users.level`, `users.xp`, Vitality, PvP Point, ownership, or inventory values. Existing achieved levels never decrease and residual XP is retained until the next server-authoritative award projects it through the Lv1–100 curve. Lv100 progress becomes 0. Accounts above Lv100 are retained and reported for audit rather than rewritten.

Historical Raid attempt rows remain for compatibility but are removed from active entry-cost calculation. Users with historical Raid attempts are backfilled as having consumed the first-ever free entry.

## Fresh activation reference

The Lv8 budget is a cross-funnel machine simulation: Tutorial 100; Free Gacha + First Growth 200; First Quest/Battle 250; First PvP 300; First Raid 350; Guild/Social activation 250; remaining activation/Second Raid 300; total `1,750`. Friend and Friend Helper are omitted. Quest-only timing is not an acceptance gate. The final 45–60 minute acceptance is rerunnable after Phase B3 Quest Freeze.

Authority Gap: `0`.

## Development state

- Project: `vosbyukxmskvisbgleug`
- `00176`–`00180`: physical applied / history pending
- `supabase_migrations.schema_migrations` head remains `20260820000166`
- `MIGRATION_HISTORY_RECONCILIATION_DEFERRED`
- Preview / Production: not applied

## Scope exclusions

Friend systems, Guild combat buffs, Quest reward seeding, Battle Presentation, Preview/Production application, and migration-history repair are outside Phase B2.
