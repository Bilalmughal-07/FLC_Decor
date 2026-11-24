INSERT INTO "Permission" ("id", "code", "description") VALUES
  (gen_random_uuid()::text, 'notifications.read', 'Read notification and outbox delivery state'),
  (gen_random_uuid()::text, 'notifications.retry', 'Retry reviewed failed notification events')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" IN ('ADMIN', 'OWNER')
  AND p."code" IN ('notifications.read', 'notifications.retry')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
