# Supabase Environment Audit — 2026-08-13

No Production database change or project deletion was performed.

## Project inventory

| Status | Project | Ref | Migration history | Current role |
| --- | --- | --- | --- | --- |
| Canonical | `tribe-neon-prod` | `ktpolnkyyfkowxdmijww` | table present, 0 rows | Production; not yet promoted from Preview |
| Canonical | `tribe-neon-preview` | `sufvuqdnqohpfzkwxohq` | 179 rows, latest `20260813000150` | Clean replay / RC verification |
| Canonical | `tribe-neon-dev-clean` | `vosbyukxmskvisbgleug` | 179 rows, latest `20260813000150` | New Development |
| RETIRED | `tribe-neon-dev` | `hggzvgdrgrboxmeywebw` | migration table absent | Legacy only; excluded from normal operations |

The normalized Development and Preview schema dumps are identical:

```text
9ae19d1321b110e143eab3e3b89d0ca3c565f4b3aa7201f42b35bae9143750ad
```

The legacy project is intentionally not schema-compatible and is not a source of schema or master data.

## Schema-external settings

| Area | Production | Preview | Development | Retired legacy dev |
| --- | --- | --- | --- | --- |
| Anonymous auth | Off | On | On | Off |
| Manual identity linking | Off | On | On | Off |
| Email auth | On | On | On | On |
| Google provider | Configured | Off | Configured | Off |
| Realtime | `direct_messages` only | canonical 4 public tables | canonical 4 public tables | overbroad legacy publication |
| Edge Functions | none | `resolve-battle` | `resolve-battle` | `resolve-battle` |
| Custom Edge secrets | none detected | none detected | none detected | none detected |
| Storage buckets | none | none | none | none |
| Cron / pg_net | none | none | none | none |
| Auth users | 1 | 6 QA/test | 1 QA/test | 1 legacy |

Secret values were not exported, logged, or copied. Auth/QA user data was not copied. The legacy Realtime configuration must not be migrated.

## Verification

- Development/Preview normalized schema comparison: PASS.
- Development migration history through `00150`: PASS.
- M8 final security gate: 8/8 PASS.
- Official Replay/PvP/Raid/Funnel/P0+/Feature Freeze postflights: PASS.
- PvP official E2E, Raid official/lifecycle E2E, Activation/Social Funnel, Guild/Chat, Friend Invitation/Helper, session restore, and date-boundary E2E: PASS.
- TypeScript and Production build: PASS.
- Guarded CLI link round trip: Development -> Preview -> Development PASS.
- Final CLI target: `vosbyukxmskvisbgleug`.

## Vercel

Vercel variables previously shared the retired project between Development and Preview. They are now target-specific:

| Vercel target | App environment | Supabase ref |
| --- | --- | --- |
| Development | `development` | `vosbyukxmskvisbgleug` |
| Preview | `preview` | `sufvuqdnqohpfzkwxohq` |
| Production | unchanged | values remain protected/sensitive |

The new values apply to subsequent Vercel deployments. Existing immutable deployment artifacts may retain their build-time values and must not be treated as current release candidates.

## Remaining external checks before Production or legacy deletion

1. Configure Preview Google OAuth if Google sign-in is required in Preview browser E2E.
2. Before Production promotion, enable and verify anonymous sign-in/manual linking, canonical Realtime tables, `resolve-battle`, URLs, OAuth redirects, and migration `00150` or later.
3. Verify protected Production Vercel values in the Vercel dashboard; they were intentionally not read or changed in this audit.
4. Confirm no human still needs the one legacy Auth user or historical legacy deployment before separately approving project deletion.
