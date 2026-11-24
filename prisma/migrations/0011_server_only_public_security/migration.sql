-- Server-only security boundary for application objects in Supabase's exposed
-- public schema. Browser-facing API roles receive no table, view, sequence, or
-- function access and no policies. The dedicated login role is created without
-- a password; its secret must be assigned out-of-band by an approved operator.
BEGIN;

DO $flc_runtime_role$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'flc_app_server'
  ) THEN
    CREATE ROLE flc_app_server
      LOGIN
      NOSUPERUSER
      INHERIT
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$flc_runtime_role$;

ALTER ROLE flc_app_server
  LOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;
ALTER ROLE flc_app_server SET search_path TO public, pg_catalog;

DO $flc_database_access$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO flc_app_server',
    current_database()
  );
END
$flc_database_access$;

GRANT USAGE ON SCHEMA public TO flc_app_server;

-- Harden future objects created by the migration role. This repeats the
-- mandatory pre-migration guard so the desired state remains in migration
-- history and is restored by later approved recovery procedures.
DO $flc_default_privileges$
DECLARE
  api_role name;
  migration_role name := current_user;
BEGIN
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

  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
    migration_role
  );
END
$flc_default_privileges$;

-- The category trigger remains security-invoker. Pin its search path so its
-- existing unqualified Category references resolve only through trusted schemas.
ALTER FUNCTION public.flc_enforce_category_tree()
  SECURITY INVOKER;
ALTER FUNCTION public.flc_enforce_category_tree()
  SET search_path TO pg_catalog, public;
REVOKE ALL PRIVILEGES ON FUNCTION public.flc_enforce_category_tree()
  FROM PUBLIC;

-- The view must obey the invoker's RLS context and remain invisible to Data API
-- roles. Only the dedicated server role receives SELECT.
ALTER VIEW public."AnalyticsDailyPlacedValue"
  SET (security_invoker = true);
REVOKE ALL PRIVILEGES ON TABLE public."AnalyticsDailyPlacedValue"
  FROM PUBLIC;
GRANT SELECT ON TABLE public."AnalyticsDailyPlacedValue"
  TO flc_app_server;

DO $flc_secure_application_tables$
DECLARE
  table_name name;
  api_role name;
  application_tables constant name[] := ARRAY[
    'User',
    'MfaFactor',
    'MfaRecoveryCode',
    'PasswordResetToken',
    'Session',
    'Category',
    'Product',
    'ProductCategory',
    'Variant',
    'MediaAsset',
    'ProductMedia',
    'VariantMedia',
    'Cart',
    'CartItem',
    'Order',
    'OrderItem',
    'InventoryLedger',
    'CheckoutIdempotency',
    'GuestTrackingVerification',
    'OrderStatusEvent',
    'AuditEvent',
    'CustomerProfile',
    'CustomerAddress',
    'CustomerConsent',
    'Role',
    'Permission',
    'RolePermission',
    'UserRole',
    'InventoryLocation',
    'InventoryBalance',
    'InventoryMovement',
    'StockReservation',
    'OrderAddressSnapshot',
    'ProductPriceHistory',
    'Shipment',
    'ShipmentItem',
    'ShipmentTrackingEvent',
    'PaymentIntent',
    'PaymentAttempt',
    'PaymentTransaction',
    'PaymentWebhookEvent',
    'Refund',
    'PaymentReconciliation',
    'OutboxEvent',
    'JobAttempt',
    'Notification',
    'NotificationDelivery',
    'GuestTrackingChallenge',
    'GuestTrackingCapability',
    'SystemSetting'
  ]::name[];
BEGIN
  FOREACH table_name IN ARRAY application_tables
  LOOP
    IF pg_catalog.to_regclass(format('%I.%I', 'public', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Required FLC Decor table public.% is missing', table_name;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      'public',
      table_name
    );
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC',
      'public',
      table_name
    );

    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']::name[]
    LOOP
      IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
          'public',
          table_name,
          api_role
        );
      END IF;
    END LOOP;

    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO flc_app_server',
      'public',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY flc_server_only ON %I.%I FOR ALL TO flc_app_server USING (true) WITH CHECK (true)',
      'public',
      table_name
    );
  END LOOP;
END
$flc_secure_application_tables$;

-- Migration history is not application runtime data. RLS and revokes protect
-- it from API/runtime roles while the owning direct migration role retains its
-- normal owner access for future `prisma migrate deploy` operations.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations
  FROM PUBLIC, flc_app_server;

DO $flc_revoke_api_view_and_function$
DECLARE
  api_role name;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']::name[]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
        'AnalyticsDailyPlacedValue',
        api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON FUNCTION public.flc_enforce_category_tree() FROM %I',
        api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations FROM %I',
        api_role
      );
    END IF;
  END LOOP;
END
$flc_revoke_api_view_and_function$;

COMMIT;
