-- Assertions for a freshly migrated LOCAL FLC Decor database.
\set ON_ERROR_STOP on

DO $flc_security_assertions$
DECLARE
  api_role name;
  insecure_table name;
  policy_count integer;
  application_table_count integer;
  function_is_definer boolean;
  function_settings text[];
  view_options text[];
BEGIN
  SELECT count(*) INTO application_table_count
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');
  IF application_table_count <> 51 THEN
    RAISE EXCEPTION 'Expected 50 application tables plus _prisma_migrations, found %', application_table_count;
  END IF;

  SELECT c.relname INTO insecure_table
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity
  LIMIT 1;
  IF insecure_table IS NOT NULL THEN
    RAISE EXCEPTION 'RLS is disabled on public.%', insecure_table;
  END IF;

  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policy AS p
  JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public';
  IF policy_count <> 50 THEN
    RAISE EXCEPTION 'Expected one server-only policy per application table, found %', policy_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL unnest(p.polroles) AS policy_role(oid)
    LEFT JOIN pg_catalog.pg_roles AS r ON r.oid = policy_role.oid
    WHERE n.nspname = 'public'
      AND (policy_role.oid = 0 OR r.rolname IN ('anon', 'authenticated', 'service_role'))
  ) THEN
    RAISE EXCEPTION 'A browser-facing or PUBLIC RLS policy exists in public';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT ('flc_app_server'::regrole::oid = ANY(p.polroles))
  ) THEN
    RAISE EXCEPTION 'A public policy is not restricted to flc_app_server';
  END IF;

  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']::name[]
  LOOP
    IF has_table_privilege(api_role, 'public."User"', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR has_table_privilege(api_role, 'public."Order"', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR has_table_privilege(api_role, 'public."AnalyticsDailyPlacedValue"', 'SELECT')
       OR has_table_privilege(api_role, 'public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION '% retains access to a sensitive FLC object', api_role;
    END IF;

    IF has_function_privilege(api_role, 'public.flc_enforce_category_tree()', 'EXECUTE') THEN
      RAISE EXCEPTION '% can execute flc_enforce_category_tree()', api_role;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('flc_app_server', 'public."User"', 'SELECT,INSERT,UPDATE,DELETE')
     OR NOT has_table_privilege('flc_app_server', 'public."Order"', 'SELECT,INSERT,UPDATE,DELETE')
     OR NOT has_table_privilege('flc_app_server', 'public."AnalyticsDailyPlacedValue"', 'SELECT') THEN
    RAISE EXCEPTION 'flc_app_server is missing required application privileges';
  END IF;
  IF has_table_privilege('flc_app_server', 'public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'flc_app_server can access Prisma migration history';
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO function_is_definer, function_settings
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'flc_enforce_category_tree';
  IF function_is_definer OR function_settings IS NULL
     OR NOT ('search_path=pg_catalog, public' = ANY(function_settings)) THEN
    RAISE EXCEPTION 'Category trigger function is not security-invoker with a pinned search_path';
  END IF;

  SELECT c.reloptions INTO view_options
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'AnalyticsDailyPlacedValue';
  IF view_options IS NULL OR NOT ('security_invoker=true' = ANY(view_options)) THEN
    RAISE EXCEPTION 'AnalyticsDailyPlacedValue is not security_invoker';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'flc_app_server'
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR NOT rolcanlogin)
  ) THEN
    RAISE EXCEPTION 'flc_app_server has unsafe role attributes';
  END IF;
END
$flc_security_assertions$;

-- Verify the post-migration default ACL with newly created local probe objects.
CREATE TABLE public.__flc_default_privilege_probe (id integer PRIMARY KEY);
CREATE FUNCTION public.__flc_default_privilege_probe_function()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS 'SELECT 1';

DO $flc_default_acl_assertions$
DECLARE
  api_role name;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']::name[]
  LOOP
    IF has_table_privilege(api_role, 'public.__flc_default_privilege_probe', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'Default table privileges still expose new objects to %', api_role;
    END IF;
    IF has_function_privilege(api_role, 'public.__flc_default_privilege_probe_function()', 'EXECUTE') THEN
      RAISE EXCEPTION 'Default function privileges still expose new objects to %', api_role;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) AS acl
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = '__flc_default_privilege_probe_function'
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'PUBLIC retains default EXECUTE on new functions';
  END IF;
END
$flc_default_acl_assertions$;

DROP FUNCTION public.__flc_default_privilege_probe_function();
DROP TABLE public.__flc_default_privilege_probe;

-- Exercise RLS and DML as the non-owner server role. The probe is rolled back.
BEGIN;
SET LOCAL ROLE flc_app_server;
SELECT count(*) FROM public."Product";
SELECT count(*) FROM public."AnalyticsDailyPlacedValue";
INSERT INTO public."AuditEvent" (
  "id", "actorType", "action", "targetType", "safeMetadata", "createdAt"
) VALUES (
  'local-security-probe', 'SYSTEM', 'LOCAL_SECURITY_PROBE', 'DATABASE', '{}'::jsonb, CURRENT_TIMESTAMP
);
ROLLBACK;
