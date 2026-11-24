INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" IN ('ADMIN', 'OWNER')
  AND p."code" = 'orders.transition'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
