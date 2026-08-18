-- Development-only, read-only audit. Never use this as a deletion query.
-- Expected project ref: vosbyukxmskvisbgleug

WITH identity_summary AS (
  SELECT
    user_id,
    count(*) AS identity_count,
    array_agg(DISTINCT provider ORDER BY provider) AS providers
  FROM auth.identities
  GROUP BY user_id
), classified AS (
  SELECT
    au.id AS auth_user_id,
    pu.username,
    au.email,
    coalesce(au.is_anonymous, false) AS is_anonymous,
    coalesce(ids.identity_count, 0) AS identity_count,
    coalesce(ids.providers, ARRAY[]::text[]) AS providers,
    pu.id IS NOT NULL AS has_game_profile,
    tp.step_id AS tutorial_step,
    au.created_at,
    au.last_sign_in_at,
    CASE
      WHEN NOT coalesce(au.is_anonymous, false)
        OR coalesce(ids.identity_count, 0) > 0
        OR au.email IS NOT NULL
        THEN 'KEEP_AUTHENTICATED'
      WHEN pu.id IS NULL THEN 'QA_OR_ABANDONED_AUTH_ONLY'
      WHEN pu.username ~* '^(GL|GA|BA|BR|DS|DR|DO|LB|LO|MS|MO|CG|M1|NP|PR|PF|SK|TB|TG|TP)[0-9a-z]{4,6}$'
        OR pu.username ~ '^N[A-Z0-9]{6}$'
        THEN 'QA_STRONG_MATCH'
      ELSE 'REVIEW_ANONYMOUS_PLAYER'
    END AS audit_class
  FROM auth.users au
  LEFT JOIN public.users pu ON pu.id = au.id
  LEFT JOIN identity_summary ids ON ids.user_id = au.id
  LEFT JOIN public.tutorial_progress tp ON tp.user_id = au.id
), profile_orphans AS (
  SELECT
    pu.id AS auth_user_id,
    pu.username,
    NULL::text AS email,
    NULL::boolean AS is_anonymous,
    0::bigint AS identity_count,
    ARRAY[]::text[] AS providers,
    true AS has_game_profile,
    tp.step_id AS tutorial_step,
    pu.created_at,
    NULL::timestamptz AS last_sign_in_at,
    'ORPHAN_GAME_PROFILE'::text AS audit_class
  FROM public.users pu
  LEFT JOIN auth.users au ON au.id = pu.id
  LEFT JOIN public.tutorial_progress tp ON tp.user_id = pu.id
  WHERE au.id IS NULL
), all_rows AS (
  SELECT * FROM classified
  UNION ALL
  SELECT * FROM profile_orphans
)
SELECT
  audit_class,
  count(*) AS user_count,
  min(created_at) AS oldest_created_at,
  max(created_at) AS newest_created_at
FROM all_rows
GROUP BY audit_class
ORDER BY audit_class;

-- Candidate detail. Review every row before any cleanup decision.
WITH identity_summary AS (
  SELECT
    user_id,
    count(*) AS identity_count,
    array_agg(DISTINCT provider ORDER BY provider) AS providers
  FROM auth.identities
  GROUP BY user_id
)
SELECT
  au.id AS auth_user_id,
  pu.username,
  au.email,
  coalesce(au.is_anonymous, false) AS is_anonymous,
  coalesce(ids.identity_count, 0) AS identity_count,
  coalesce(ids.providers, ARRAY[]::text[]) AS providers,
  pu.id IS NOT NULL AS has_game_profile,
  tp.step_id AS tutorial_step,
  au.created_at,
  au.last_sign_in_at,
  CASE
    WHEN pu.id IS NULL THEN 'QA_OR_ABANDONED_AUTH_ONLY'
    WHEN pu.username ~* '^(GL|GA|BA|BR|DS|DR|DO|LB|LO|MS|MO|CG|M1|NP|PR|PF|SK|TB|TG|TP)[0-9a-z]{4,6}$'
      OR pu.username ~ '^N[A-Z0-9]{6}$'
      THEN 'QA_STRONG_MATCH'
    ELSE 'REVIEW_ANONYMOUS_PLAYER'
  END AS audit_class
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
LEFT JOIN identity_summary ids ON ids.user_id = au.id
LEFT JOIN public.tutorial_progress tp ON tp.user_id = au.id
WHERE coalesce(au.is_anonymous, false)
  AND au.email IS NULL
  AND coalesce(ids.identity_count, 0) = 0
ORDER BY audit_class, au.created_at;
