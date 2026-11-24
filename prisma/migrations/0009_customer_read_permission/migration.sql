INSERT INTO "Permission" ("id", "code", "description")
VALUES (gen_random_uuid()::text, 'customers.read', 'Read minimized customer account summaries')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" IN ('ADMIN', 'OWNER') AND p."code" = 'customers.read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
