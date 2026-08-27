# Guild Production Freeze — 2026-08-23

Status: **PASS / FROZEN**

Guild is the pre-open Social Core. Friend/Friend Helper are omitted, GvG is closed, and Guild combat buffs are zero until the GvG phase.

## Progression

Guild levels are 1–5. Required EXP is 1,000 / 2,500 / 6,000 / 12,000 (cumulative Lv5: 21,500). Member caps are 10 / 12 / 14 / 17 / 20. Level-up supports multiple levels and retains overflow; Lv5 retains additional EXP. Existing over-cap Guilds keep all members, but cannot add members until under cap.

Per member and JST calendar day, each source grants at most once: LOGIN 10, FIRST_GUILD_CHAT 10, QUEST_3_CLEAR 10, PVP_FINALIZED 10, RAID_FINALIZED 15, DONATION 20. Maximum is 75 EXP/member/day. The unique ledger key is Guild, User, Source, JST date.

## Social operations

Creation requires User Lv5 and 5,000 CASH; trimmed names are 1–12 characters. Roles are MASTER, SUB_MASTER, MEMBER. SUB_MASTER may review applications, kick MEMBERs, edit recruitment/description/welcome, and use Guild Shop; only MASTER may assign roles, act on SUB_MASTER, transfer leadership, or disband.

Recruitment modes are OPEN_JOIN, APPLICATION_REQUIRED, CLOSED. Mode changes retain pending applications. Capacity and authorization are rechecked under transaction locks.

Production donation is exactly 5,000 CASH → Guild EXP +20, once/member/JST day, with no personal reward.

Recommendation algorithm v1.1 and all eleven repository weights are frozen structurally; weights remain P0_TUNABLE. Eligibility excludes full, closed, invalid, and disbanded Guilds. Weekly rotation is deterministic and never uses database random ordering or fake Guilds.

Disband uses soft retention so immutable Raid contribution attribution remains intact. Guild Buff and active GvG/Friend CTAs are excluded from the pre-open projection.

Machine authority: `src/domain/gameplay/canonical/data/guild_production_20260823.json`.

Database integration: `20260823000186_guild_production_social_core.sql` plus the compatibility guards in `20260823000187_guild_production_compatibility_guards.sql`.
