# Local initial administrator runbook

This workflow creates the first administrator in PostgreSQL. It is local-development only, does not expose public admin registration, and does not enable production checkout.

## Prerequisites

- `.env.local` points to the intended local PostgreSQL database and has been migrated with `npm run db:deploy`.
- The database has no existing administrator and no completed `auth.initial_admin_bootstrap` marker.
- Do not put the administrator email or password in a tracked file.

## Initialize once

Run from the project root:

```powershell
npm run admin:bootstrap:local
```

The command prompts for the email, an exact `INITIAL_ADMIN_SETUP` confirmation, and a hidden password of at least 16 characters. It generates and stores a local MFA encryption key in the gitignored `.env.local` file when one is not already configured, sets the durable database auth runtime, hashes the password with scrypt, grants the limited `ADMIN` role, writes an audit event, and writes a permanent database marker. It never prints the password or key.

The command refuses production mode, non-loopback databases, invalid confirmation, weak credentials, existing administrators, and any database where bootstrap has already completed. Deleting or changing an administrator does not automatically re-enable bootstrap.

## Sign in and enroll MFA

1. Start the application with `npm run dev`.
2. Open `http://localhost:3000/admin/login`.
3. Sign in with the email and password entered during bootstrap.
4. On the enrollment page, add the displayed secret to a TOTP authenticator application.
5. Enter the current six-digit code.
6. Save the eight one-time recovery codes in a password manager. They are stored only as hashes and are displayed once.

Admin sessions are stored in PostgreSQL, require successful MFA before any admin API or page access, expire after seven days, and are revoked at logout. Current sessions remain invalid if the user is disabled or its role assignment is revoked.

## Upload the first product image

Cloudflare R2 must first be configured as described in `docs/R2_MEDIA_RUNBOOK.md`. Then open the admin dashboard, scroll to **Product media**, choose or drop a JPEG, PNG, or WebP image, approve the staged image, and use **Assign an approved image** to attach it to a product or variant. Upload controls remain disabled when R2 is not configured.

## Recovery and rotation boundaries

- Keep `.env.local` private and backed up securely; losing `AUTH_FIELD_ENCRYPTION_KEY` makes enrolled TOTP secrets unreadable.
- A recovery code is consumed atomically on use.
- Resetting administrator MFA or creating additional administrators is intentionally not exposed by this one-time bootstrap. Add a separately reviewed administrative recovery workflow before production use.
- Production authentication deployment, credential rotation, shared rate limiting, and operational recovery remain separate readiness work.
