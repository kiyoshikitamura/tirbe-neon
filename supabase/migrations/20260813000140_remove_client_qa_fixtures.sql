-- Production Foundation: QA fixture mutation routes must never be exposed to
-- browser clients. Development data preparation remains available through
-- reviewed SQL in supabase/manual and service-role-only tooling.

BEGIN;

DROP FUNCTION IF EXISTS public.provision_qa_fixture();
DROP FUNCTION IF EXISTS public.provision_qa_cosmetic_fixture();
DROP FUNCTION IF EXISTS public.provision_qa_character_cosmetic_fixture();
DROP FUNCTION IF EXISTS public.provision_qa_ui1_fixture();
DROP FUNCTION IF EXISTS public.apply_qa_ui1_fixture(uuid);

COMMIT;
