-- FLC Decor initial Supabase deployment guard.
--
-- This script MUST run over the approved direct migration connection before
-- the first `prisma migrate deploy`. It changes only the default privileges of
-- the current migration role. It deliberately refuses to run after any object
-- has already been created in public, because its purpose is to prevent the
-- temporary Data API exposure window during migrations 0001-0011.
--
-- Do not run this against an existing application schema. Do not substitute a
-- pooled runtime connection for the direct migration connection.

BEGIN;

DO $flc_pre_migration$
DECLARE
  api_role name;
  migration_role name := current_user;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION
      'FLC pre-migration guard requires an empty public schema; no privileges changed';
  END IF;

  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']::name[]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        migration_role,
        api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        migration_role,
        api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON FUNCTIONS FROM %I',
        migration_role,
        api_role
      );
    END IF;
  END LOOP;

  -- Function EXECUTE is granted to PUBLIC by PostgreSQL's global default.
  -- A schema-scoped default-privilege change cannot remove that grant.
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
    migration_role
  );
END
$flc_pre_migration$;

COMMIT;
