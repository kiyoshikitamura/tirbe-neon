# Supabase Environment Runbook

Updated: 2026-08-13

## Canonical environments

| Environment | Supabase project | Project ref | Role |
| --- | --- | --- | --- |
| Development | `tribe-neon-dev-clean` (canonical Development) | `vosbyukxmskvisbgleug` | Daily implementation, migration creation, and development DB verification |
| Preview | `tribe-neon-preview` | `sufvuqdnqohpfzkwxohq` | Clean replay, integration E2E, security gate, and release-candidate verification |
| Production | `tribe-neon-prod` | `ktpolnkyyfkowxdmijww` | Live users; no mutation without an explicit Production operation |

The former `tribe-neon-dev` project (`hggzvgdrgrboxmeywebw`) is **LEGACY / RETIRED**. It is not a valid CLI, local env, Vercel, script, target-guard, or Codex development target. The Supabase project is retained temporarily and must not be deleted until a separate deletion approval.

## Promotion flow

Changes move in one direction only:

`Development` -> `Preview` -> `Production`

Database schema and required master/system data are defined by `supabase/migrations/`. Do not make a schema change directly in Production and import it back into Development.

## Local environment files

- `.env.development.local`: canonical Development URL, public anon key, access token, DB password, and expected ref.
- `.env.preview.local`: canonical Preview values plus `SUPABASE_PREVIEW_PROJECT_REF`.
- `.env.production.local`: Production secrets when an explicitly approved Production operation is required.

These files are ignored by Git. Never commit access tokens, DB passwords, service-role keys, or OAuth secrets.

## CLI link and target guard

Link only through the guarded command:

```powershell
npm run supabase:link:development
npm run supabase:link:preview
```

Every guarded operation verifies all of the following:

1. the requested environment exists in `config/supabase-targets.json`;
2. `SUPABASE_EXPECTED_PROJECT_REF` matches the canonical ref;
3. Preview's explicit ref also matches the canonical Preview ref;
4. the current Supabase CLI link matches the same ref;
5. Development, Preview, and Production refs are distinct.

Production linking or mutation additionally requires:

```text
SUPABASE_PRODUCTION_CHANGE_CONFIRMATION=TRIBE_NEON_PRODUCTION_ktpolnkyyfkowxdmijww
```

## Preview verification

Before promotion to Production:

1. replay all migrations into an empty Preview-compatible database;
2. compare normalized schema dumps with Development;
3. run the M8 final security gate;
4. run P0, P0+, Feature Freeze, Activation/Social Funnel, PvP, Raid, Guild/Chat, Friend, and time-boundary E2E;
5. run TypeScript and a Production build.

### Mobile device Preview

The stable mobile verification URL is:

```text
https://tribe-neon-mobile-preview.vercel.app
```

Deploy without `--prod`, then move the stable alias to the new Preview deployment.
The Vercel Preview target must use Preview Supabase, and Preview Auth must retain
the stable URL in its redirect allow-list. Apply the guarded Auth URL update with:

```powershell
npm run supabase:auth:mobile-preview
```

Never point this alias at a Production deployment or reuse Production Supabase
credentials for mobile Preview testing.

Preview Google OAuth should use a dedicated Preview Web OAuth client. The Google
Auth Platform client must include both the stable mobile Preview origin and the
Preview Supabase callback URI. Enter its client ID and secret directly in the
Preview Supabase Dashboard; do not copy Development or Production secrets.

## Dashboard-managed settings

Schema migrations do not carry Auth provider credentials, Site/Redirect URLs, Edge Function secrets, or some Dashboard-managed Realtime settings. Audit those settings separately before Production promotion. Do not copy QA users or user data between environments.

As of 2026-08-13, Development and Preview have anonymous/manual-linking authentication enabled, the intended four Realtime tables, the `resolve-battle` function, and no custom Storage/Cron/Webhook state that must be migrated from the retired project.
