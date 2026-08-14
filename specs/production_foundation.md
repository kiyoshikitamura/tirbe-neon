# Production Foundation

## Objective

The release database must be reproducible from an empty Supabase project using
the repository migration chain. Development and Production are never used as
clean-replay targets.

## Canonical migration set

- `20260731000000_initial_schema.sql` through
  `20260813000143_restore_canonical_guild_lifecycle_rpcs.sql` are applied in
  filename order.
- The 36 M1-M8 files from `20260812000104` through `20260813000139` are all
  required. `20260813000137` is a read-only M8 contract check and intentionally
  remains in the ordered chain.
- Master and provisional Open Beta data are installed by idempotent migrations;
  `supabase/seed.sql` is intentionally not used.
- SQL in `supabase/manual` is never part of a Production replay.
- SQL in `supabase/postflight` verifies the resulting state and does not mutate it.

## Environment separation

Canonical non-secret project refs are recorded in
`config/supabase-targets.json`. Preview must be a third, disposable project and
is supplied through `SUPABASE_PREVIEW_PROJECT_REF`.

Every repository-managed DB mutation requires all three of the following:

1. an explicit `--environment` argument;
2. `SUPABASE_EXPECTED_PROJECT_REF` matching that environment;
3. the Supabase CLI linked project matching the same ref.

Production additionally requires
`SUPABASE_PRODUCTION_CHANGE_CONFIRMATION=TRIBE_NEON_PRODUCTION_<project-ref>`.
Raw `supabase db push`, `supabase migration up`, and Dashboard SQL execution are
not release procedures.

Example Preview command after linking the disposable Preview project:

```powershell
$env:SUPABASE_PREVIEW_PROJECT_REF = '<preview-ref>'
$env:SUPABASE_EXPECTED_PROJECT_REF = '<preview-ref>'
npm run supabase:guarded -- --environment preview -- db push --include-all
```

The guard must be run before read-only postflight or E2E commands as well, even
though those commands do not mutate the database:

```powershell
node scripts/verify_supabase_target.mjs --environment preview
```

## QA exclusion

Migration `20260813000140` removes all browser-callable QA fixture functions.
The QA settings UI is compiled only when both conditions are true:

- `NEXT_PUBLIC_APP_ENV=development`
- `NEXT_PUBLIC_ENABLE_QA_TOOLS=true`

Production must set `NEXT_PUBLIC_APP_ENV=production`; Mock mode is rejected in
that environment.

## M9 entry gate

1. Apply every canonical migration to an empty Preview project.
2. Run every relevant postflight, including `m8_final_security_gate.sql`.
3. Dump the resulting `public` schema and compare it with the latest Development
   schema after normalizing owners and environment-managed objects.
4. Resolve every unexplained difference through a new migration.
5. Run the major DB E2E suite against Preview.
6. Stop and report results before starting M9.

## 2026-08-13 verification record

- Empty Preview remote reset replayed the complete migration chain through
  `00143` without an error.
- The normalized Preview and Development `public` schema dumps were identical:
  `sha256=6a147b4f1a879d7f7ca0217c233a30e398197051de591cf031ce425eee24b816`.
- The Preview M8 final security gate passed all 8 checks, including absence of
  client-callable QA fixture functions.
- Preview DB E2E passed for anonymous onboarding, tutorial patrol and gacha,
  character gacha, normal NPC patrol battle, guild membership and chat, BBS,
  direct messages, login bonus, and missions. A second post-reset sweep reached
  the Preview Auth anonymous-sign-in rate limit after the core paths had passed;
  this was an external test-fixture throttle rather than a DB assertion failure.
- `resolve-battle` was deployed to Preview only. No Production database,
  function, Auth, Vercel, or DNS setting was changed.
