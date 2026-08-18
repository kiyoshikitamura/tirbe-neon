# M9X Cold Start / Social Execution Record

## Scope

This record captures the repository implementation derived from the GAME03 M9X
Codex package. Production is excluded. Database changes move in one direction:
Development to Preview.

## Tutorial contract

- Canonical sequence: GACHA -> AUTO_FORMATION -> DISPATCH -> FREE_INSTANT ->
  TUTORIAL_BATTLE -> RULE_GUIDE.
- Growth is not a blocking tutorial step. It remains available from the post-
  tutorial POWER mission hub.
- `execute_tutorial_character_gacha(uuid)` is a tutorial-only, request-id
  idempotent ten-pull. Slots 1-9 use the active normal pool; slot 10 is resolved
  by the server from the active canonical SSR pool. It does not consume the daily
  normal-gacha claim.
- `complete_current_tutorial_formation()` selects an owned SSR first, persists the
  existing main-formation contract, equips the best eligible owned skill through
  the canonical loadout function, and advances directly to DISPATCH. Retries after
  advancement are successful no-ops.
- The tutorial quest remains the fixed Shinjuku beginner patrol. PRE_OPEN speed-up
  is free below player level 8 and is decided by the server.
- Completion uses three short rule slides: WORLD, POWER, and TRIBE, followed by the
  Mission Hub.

## Social contract

- `social_activity_feed` contains only server-derived real events: completed SSR
  acquisition, permanent guild creation, and a change of the total-power rank #1
  leader. No fake player or bot activity is generated.
- Activity actor names link to the existing public profile contract; profile friend
  actions continue to use the existing friend RPC boundary.
- Guild Home displays a configurable `welcome_message`, falling back to the product
  default. Greeting CTAs are presets only and never auto-send.
- Chat replies use one-level `reply_to_message_id` references. Threads are not
  introduced.
- Human-response metrics exclude system messages and self-replies.
- NPC PvP simulation is practice-only and does not write match history, ranking,
  rewards, or PvP Rank Point.

## Remaining P0 completion (2026-08-18)

- NPC PvP Practice reuses the existing party setup, timeline, action presentation,
  and result viewer. It deliberately does not create an official replay or legacy
  battle session and does not call the official PvP start/finalize contracts.
- Guild masters can edit the 120-character Welcome copy through the existing
  `set_current_guild_welcome_message(text)` contract. Members receive read-only
  Welcome presentation and an explicit, editable greeting preset.
- The canonical Tutorial E2E follows `WORLD_INTRO -> GACHA -> AUTO_FORMATION ->
  DISPATCH -> FREE_INSTANT -> TUTORIAL_BATTLE -> RULE_GUIDE`; removed Growth and
  legacy entry labels are no longer asserted.
- The Title-to-human-response journey covers discovery, immediate join, explicit
  greeting, reload/unread recognition, and another member's reply. Visual gates
  run at 375, 390, and 430 px for Title, Home, Guild discovery, Practice setup and
  viewer, Welcome, and the human-response chat state.
- Production deployment is outside this completion scope.

## Database artifacts

- `20260818000161_m9x_cold_start_social_foundation.sql`
- `20260818000162_m9x_activity_welcome_retention.sql`
- Matching postflight checks under `supabase/postflight/`

Both migrations are required for clean replay and have been verified on Development
and Preview. Production application requires a separate explicit release operation.
