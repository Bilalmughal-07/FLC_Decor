\set ON_ERROR_STOP on

-- LOCAL TEST ONLY. Run after supabase-pre-migration-security.sql and before
-- Prisma migrations. This proves that objects created during the migration
-- sequence are not temporarily exposed through Supabase Data API roles.

DO $verify$
DECLARE
  relation_count integer;
BEGIN
  SELECT count(*)
    INTO relation_count
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f');

  IF relation_count <> 0 THEN
    RAISE EXCEPTION
      'Pre-migration verification requires an empty public schema; found % relations',
      relation_count;
  END IF;
END
$verify$;

CREATE TABLE public.pre_migration_acl_probe (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

CREATE FUNCTION public.pre_migration_acl_probe_function()
RETURNS integer
LANGUAGE sql
AS 'SELECT 1';

DO $verify$
DECLARE
  api_role name;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon'::name, 'authenticated'::name, 'service_role'::name]
  LOOP
    IF has_table_privilege(api_role, 'public.pre_migration_acl_probe', 'SELECT')
       OR has_table_privilege(api_role, 'public.pre_migration_acl_probe', 'INSERT')
       OR has_table_privilege(api_role, 'public.pre_migration_acl_probe', 'UPDATE')
       OR has_table_privilege(api_role, 'public.pre_migration_acl_probe', 'DELETE') THEN
      RAISE EXCEPTION 'API role % received a privilege on a newly created table', api_role;
    END IF;

    IF has_function_privilege(
      api_role,
      'public.pre_migration_acl_probe_function()',
      'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'API role % can execute a newly created function', api_role;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(
        COALESCE(p.proacl, acldefault('f', p.proowner))
      ) AS acl
     WHERE n.nspname = 'public'
       AND p.proname = 'pre_migration_acl_probe_function'
       AND acl.grantee = 0
       AND acl.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'PUBLIC can execute a newly created function';
  END IF;
END
$verify$;

DROP FUNCTION public.pre_migration_acl_probe_function();
DROP TABLE public.pre_migration_acl_probe;

DO $verify$
DECLARE
  relation_count integer;
BEGIN
  SELECT count(*)
    INTO relation_count
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f');

  IF relation_count <> 0 THEN
    RAISE EXCEPTION 'Pre-migration probe cleanup failed; found % relations', relation_count;
  END IF;
END
$verify$;
