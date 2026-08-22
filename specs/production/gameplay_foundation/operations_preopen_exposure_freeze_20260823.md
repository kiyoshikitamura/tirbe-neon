# Operations / Pre-open Exposure Freeze — 2026-08-23

Status: **PASS / FROZEN**

The server-side `feature_operating_states` projection is authoritative. The client consumes that projection through the shared operations resolver; it cannot promote a closed feature to open. Existing closed-feature data and core RPC implementations are retained behind server mutation guards.

## Exposure matrix

| Feature | State | UI | Navigation/deep link | Mutation | Fallback |
|---|---|---|---|---|---|
| Home, Tutorial, Character, Skill, Equipment, Formation, Bag | OPEN | Visible | Allowed | Allowed | — |
| Quest, PvP, Raid, Ranking, Mission | OPEN | Visible | Allowed | Allowed where applicable | — |
| Guild, Guild Chat, Invite, Present, Normal Gacha | OPEN | Visible | Allowed | Allowed | — |
| Friend | CLOSED | Hidden | Home | Rejected | Home |
| Friend Helper | CLOSED | Hidden | N/A | Rejected; absent from battle snapshot | No helper |
| Shop | CLOSED | Hidden | Home | Rejected | Home |
| Payment | CLOSED | Hidden | Home | Rejected | Home |
| Special Gacha | CLOSED | Hidden | Normal Gacha/Home | Rejected | Normal Gacha |
| GvG | CLOSED | Hidden | Home | Rejected | Home |
| Guild Combat Buff | CLOSED | Hidden | N/A | Rejected; absent from battle snapshot | No buff |
| Maintenance | Manual | Maintenance screen | Safe bootstrap only | Authenticated user mutations rejected | Maintenance screen |

`PRE_OPEN` remains an internal, non-visible compatibility state for existing pre-open RPC contracts.

## Product separation

- Friend and Friend Helper are intentionally omitted for pre-open. Relations and RPC cores are preserved for a future release.
- Invite remains an acquisition/referral feature and is not presented as friendship.
- Guild remains the social core. Guild member profiles, recommendation, membership, welcome, chat, and donation stay available.
- Shop, Payment, Special Gacha, GvG, and Guild Combat Buff are deferred by the release plan and are hidden rather than displayed as disabled primary actions.

## Maintenance

Production v1 uses manual server state. `message`, `started_at`, and `ends_at` can be projected without requiring a scheduler. Service-role operations remain possible; authenticated gameplay mutations are rejected while maintenance is active. A state-change audit ledger records old state, new state, actor, and timestamp.

## Security and compatibility

- UI visibility is not the security boundary. Closed Friend, Friend Helper, Shop, Payment, Special Gacha, and GvG mutations are rejected server-side.
- Existing RLS remains enabled and is not relaxed.
- No Friend relation, Shop inventory, Special ticket, GvG record, or Guild Buff compatibility column is deleted.
- Closed/unknown URL tabs are normalized to Home without a redirect loop.
- Closed destinations are filtered out of home banners, primary CTA candidates, badges, notifications, and the activity projection.

## Simplification audit

| Decision | Classification | UX cost |
|---|---|---|
| Friend/Friend Helper omitted | INTENTIONAL_PRODUCT_SIMPLIFICATION | None in the pre-open social model; Guild retains social proof |
| Shop/Payment/Special Gacha/GvG/Guild Buff hidden | DEFERRED_BY_RELEASE_PLAN | No dead or disabled controls exposed |
| Shared feature resolver and safe route fallback | NO_SIMPLIFICATION | None |

`IMPLEMENTATION_SHORTCUT_WITH_UX_COST = 0`.

## Human acceptance pending

Human review is still required on Desktop, 390×844, and 412×915 for icon alignment, closed-feature absence, empty-space handling, safe-area behavior, navigation/back-forward behavior, and continued Guild/PvP/Raid visibility. Automated validation does not claim Human PASS.
