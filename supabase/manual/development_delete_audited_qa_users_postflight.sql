-- Read-only verification after development_delete_audited_qa_users.sql.
WITH target_ids(id) AS (
  VALUES
    ('bdeabf39-3609-4188-9f7c-5f732e544923'::uuid),
    ('60da26d8-b4bf-423c-9926-8a092039e0a7'::uuid),
    ('be8ed21e-9f40-4422-93c7-5602bb69b709'::uuid),
    ('ffefee33-09f9-4da2-a1c4-621997d62326'::uuid),
    ('f99fc03d-9832-4f80-a656-163b245b3de6'::uuid),
    ('e8bb7483-a225-4dd2-a302-fc5ab2076c87'::uuid),
    ('235a5a35-17f5-4227-ad30-2bf356a603ec'::uuid),
    ('2930047b-5795-43d5-87e2-d556c03d7a47'::uuid),
    ('1dca0e8f-061f-4a32-9c24-bc34023c5542'::uuid),
    ('5dd74805-2af2-4d22-b32c-2b7e4c289d55'::uuid),
    ('4c063cd5-55e0-498c-b3b9-b31e925ff217'::uuid),
    ('d1e55300-e0a7-4b9b-b682-1ea5bf7ec034'::uuid),
    ('8d3fad90-a3a0-4a8d-b398-809d85d4d68e'::uuid),
    ('d9003f87-c620-4811-b302-b3ac5b4c73d0'::uuid),
    ('95fa9e3f-82f6-4a3c-b7de-54bb15c89987'::uuid),
    ('bd287916-2845-49ce-bb34-06cb8aba0f34'::uuid),
    ('2f71d6a6-9389-48ca-abb0-ebaf3e2e1ac0'::uuid),
    ('5851981c-1006-4113-8ea4-480708b564ca'::uuid),
    ('8dfad5cc-8760-4c76-8855-56878181a10b'::uuid),
    ('9641dbbc-67a1-44b3-943e-d000c5f1c5b0'::uuid),
    ('b62b9e72-9645-4963-a73d-8474f409631e'::uuid),
    ('8318962e-9a4b-4bfd-8988-6bdd62843914'::uuid),
    ('ab7b2952-8fe0-4394-9c06-ad0f8ee089c4'::uuid),
    ('1f27ff3b-3084-4ce4-99f3-34e1847a4b64'::uuid),
    ('f0d7c2cd-4c13-4a50-929e-4319dcfa34a9'::uuid),
    ('1e419ceb-3f09-41af-bec2-755f9b4cd266'::uuid),
    ('fb1f9396-6e7b-42e0-b14a-05a84ab177a1'::uuid),
    ('84c0a128-353e-4ff6-b4e4-84cab83f3455'::uuid),
    ('ff58b6cc-b417-4ba0-9de4-d91bb48134c1'::uuid),
    ('11d8cc5e-9828-4cf2-8d19-e1359a11aebc'::uuid),
    ('2a834e5b-2312-4837-b2c3-fd13c64e6394'::uuid),
    ('a010a7cc-0354-4ab5-ab77-aed02c16d822'::uuid),
    ('4707606b-2404-4d82-abaa-64522f352821'::uuid),
    ('459f92b9-8870-4f71-a4d6-320768bf9bd3'::uuid),
    ('0fa7cd23-d58c-4379-bb06-c313e062b3cd'::uuid),
    ('6b58ecbd-d9b8-48da-968e-c83346ad5996'::uuid),
    ('7759a49e-640a-46c0-9eaa-56792b8f2c90'::uuid),
    ('a03cdac2-5287-43b4-aae9-c4865fb709fb'::uuid),
    ('317bc1d5-f916-4225-ac16-eca98d5ef7ea'::uuid),
    ('a9e8f719-7fd0-42ce-b3f5-be642f1e653a'::uuid),
    ('11de12f6-0843-4d96-814b-242fd7b0183f'::uuid),
    ('50bba268-2cf2-4efc-a9b3-0351a12d577f'::uuid),
    ('367b0d7e-d9b1-4425-84e3-de65455b8035'::uuid),
    ('f3e5bf13-8956-4a5c-b5cb-cb888f00a4d4'::uuid),
    ('e89eaf9d-def5-477b-8f59-3dd500cfda3f'::uuid),
    ('6f6928d3-a8b8-47af-a16d-be7ef5c60828'::uuid)
), checks AS (
  SELECT 10 AS display_order, 'auth_users_removed' AS check_name,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    count(*)::text || ' target auth user(s) remain' AS detail
  FROM auth.users au JOIN target_ids target ON target.id = au.id
  UNION ALL
  SELECT 20, 'game_profiles_removed',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' target game profile(s) remain'
  FROM public.users profile JOIN target_ids target ON target.id = profile.id
  UNION ALL
  SELECT 30, 'authenticated_players_retained',
    CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'MANUAL' END,
    count(*)::text || ' linked/email auth user(s) remain'
  FROM auth.users au
  WHERE NOT coalesce(au.is_anonymous, false)
     OR au.email IS NOT NULL
     OR EXISTS (SELECT 1 FROM auth.identities identity WHERE identity.user_id = au.id)
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
