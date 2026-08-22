# TRIBE NEON — Economy Foundation Phase B1 Authority

Version: 2026-08-22
Status: PASS / CLOSED — PRODUCTION FREEZE READY

## Production decisions

- Friend and Friend Helper are omitted from Pre-Open UI, navigation, and gameplay. Existing DB/RPC remain inactive.
- Guild is the Social Core. Invite remains Viral Acquisition / Referral and Invite Missions remain enabled.
- Guild Level/EXP remains active. Guild Combat Buff is omitted until the GvG phase.
- The existing five-character battle-party contract remains unchanged. Friend Helper does not alter Battle Runtime.
- Shop, Payment, and GvG remain closed for Pre-Open.
- Production Creative x9 is deferred to Final Device Acceptance.
- Sound is deferred until the minimum Production set before Final Device Acceptance.

## Canonical machine authorities

- Item: `src/domain/gameplay/canonical/data/items_20260822.json`
- Login Bonus: `src/domain/gameplay/canonical/data/login_bonus_20260822.json`
- Reward Supply source status: `src/domain/gameplay/canonical/data/reward_supply_20260822.json`

Mission remains frozen at 37 total: DAILY 4, NORMAL 33, WEEKLY 0. The older Reward Supply proposal for six Daily and Weekly Missions is not active.

## Character Awakening copy-equivalent contract

- Required equivalents by current Awakening level +0..+4 are `1 / 1 / 2 / 3 / 4` (cumulative +5: 11).
- One same-Character duplicate adds one target-specific copy-equivalent. Progress carries across a threshold.
- One `AWAKENING_BOOK` adds one generic copy-equivalent to the selected Character. Character Awakening consumes no CASH.
- A duplicate of a +5 Character converts atomically to `AWAKENING_BOOK ×1`; retry-safe Gacha execution prevents double grants.
- Existing `awakening_level` is preserved. `awakening_progress` begins at zero for pre-existing rows and is never reverse-derived.

## Login Special Ticket allocation

- Day 5: `SPECIAL_TICKET_CHARACTER ×1`
- Day 15: `SPECIAL_TICKET_SKILL ×1`
- Day 20: `SPECIAL_TICKET_EQUIPMENT ×1`
- Day 29: `SPECIAL_TICKET_CHARACTER ×1`
- 30-day totals: Character 2 / Skill 1 / Equipment 1; generic Special Ticket 0.
- Day 30 remains `AWAKENING_BOOK ×1`, recorded as fixed supply 1 per 30-day loop.

## Authority gaps

Phase B1 Authority Gap: 0.

No Quest/PvP/Raid/Ranking reward quantities are frozen by Phase B1.
