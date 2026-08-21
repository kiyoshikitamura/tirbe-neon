# TRIBE NEON Mission Production Master Freeze — 2026-08-21

Status: **MISSION PRODUCTION FREEZE = PASS / CLOSED**

## Machine Authority

- `src/domain/gameplay/canonical/data/missions_20260821.json`
- `src/domain/gameplay/canonical/masters.ts`
- Item IDs: `specs/production/gameplay_foundation/canonical_item_master.md`

The Machine Master contains exactly 37 enabled, non-provisional Missions:

- DAILY: 4
- NORMAL: 33
- WEEKLY: 0

Daily completion-count rewards and weekday rotation are not used in Initial Production.

## Mission IDs

- Daily: `ob_daily_login_01`, `ob_daily_patrol_01`, `ob_daily_char_level_01`, `ob_daily_gear_level_01`
- Basic Normal: `ob_normal_patrol_01`, `ob_normal_patrol_02`, `ob_normal_patrol_03`, `ob_normal_char_level_01`, `ob_normal_char_level_02`, `ob_normal_char_level_03`, `ob_normal_gear_level_01`, `ob_normal_gear_level_02`, `ob_normal_gear_level_03`, `ob_normal_gear_lb_01`, `ob_normal_gear_lb_02`, `ob_normal_skill_lb_01`, `ob_normal_skill_lb_02`, `ob_normal_guild_join_01`
- Funnel: `ob_funnel_gacha_01`, `ob_funnel_growth_01`, `ob_funnel_battle_01`, `ob_funnel_pvp_01`, `ob_funnel_raid_01`, `ob_funnel_guild_view_01`, `ob_funnel_guild_join_01`, `ob_funnel_guild_activation_01`, `ob_funnel_second_raid_01`
- Invite: `ob_invite_01` through `ob_invite_10`

## Fixed Reward IDs

- Equipment LB: `EQUIP_LB_PART` ×1
- Skill LB: `SKILL_MANUAL` ×1
- Guild Join: `NORMAL_GACHA_TICKET_CHARACTER` ×3
- Invite 01–10: `DIAMOND` ×100 each (total 1,000)

`NORMAL_CHARACTER_GACHA_TICKET`, `NORMAL_GACHA_TICKET`, `EQUIP_LB_HAMMER`, and
`SKILL_LB_BOOK` are not valid rewards in the Production Mission Master.

## Runtime Contract

- Daily cycle boundary: 00:00 JST, evaluated lazily by `sync_current_missions()`.
- Server states: `PROGRESS`, `CLEAR`, `CLAIMED`.
- UI projection: unlocked `PROGRESS` becomes `IN_PROGRESS`; an unmet prerequisite becomes `LOCKED`.
- A chained Mission can progress only after its prerequisite is `CLAIMED`.
- Funnel milestones may be recorded early. When the prerequisite is claimed, an already-recorded milestone immediately clears the newly unlocked Mission.
- Mission rewards are issued as Presents using the exact item ID and quantity in the Canonical Mission Master.
- Individual and bulk claims accept only `CLEAR` rows, lock the authoritative rows, reject duplicate claims, update `CLAIMED`, and create Presents in the same transaction under the existing advisory lock.

Basic CTAs route Patrol Missions to `patrol`, Character/Equipment/Skill progression Missions to `character`, and Guild Join to `guild`. Daily Login and Invite Missions have no CTA. Funnel CTAs remain as stored in the Machine Master, including the `guild_chat` action.

## Integration

- DB migration: `20260821000173_mission_production_master.sql`
- Character, Skill, and Equipment Normal Gacha consume their category-specific Canonical Ticket IDs.
- Equipment LB and Skill LB consume `EQUIP_LB_PART` and `SKILL_MANUAL` respectively.
- Equipment LB success dispatches `GEAR_LIMIT_BREAK` Mission progress.

Production and Preview application remain outside this freeze checkpoint. Existing generic
`NORMAL_GACHA_TICKET` balances must never be deleted implicitly; migration application stops with
`LEGACY_NORMAL_GACHA_TICKET_BALANCE_FOUND` if such a balance or unclaimed Present exists.

`src/utils/missions_master_data.ts` is retained only as legacy history and is safe to delete after downstream audit; Production Runtime active references are zero.
