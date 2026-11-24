# Cloudflare R2 media runbook

Updated: 2026-10-27 (Asia/Karachi)

## Runtime boundary

Media storage is disabled unless `MEDIA_STORAGE_RUNTIME=r2` and every required server variable is valid. Credentials are read only by Node.js server modules and are never returned by an API or included in client components.

Required server variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`, normally `https://<account-id>.r2.cloudflarestorage.com`

Optional:

- `R2_PUBLIC_BASE_URL`: an HTTPS Worker or CDN origin that exposes only the `public/` prefix. A public URL for the whole bucket would also expose `staging/` objects and must not be used. When this setting is absent, the app streams approved objects through `/api/media/[id]` after checking PostgreSQL state.

Create a private bucket and an API token limited to object read/write for that bucket. Browser CORS is not required because uploads go to the Next.js server. Do not grant account-wide administration permissions.

## Lifecycle

1. The MFA-authorized upload route checks request and file size, sniffs the signature, decodes with a pixel limit, rotates, strips metadata, and creates WebP main and thumbnail variants.
2. PostgreSQL receives a `MediaAsset` in `PENDING` state before external writes. Main and thumbnail objects are written below a collision-resistant `staging/YYYY-MM-DD/<uuid>/` key.
3. Approval atomically claims the media record, verifies both staged objects, copies them into the matching `public/` prefix with immutable cache headers, then changes the database state to `APPROVED` and audits the action.
4. Product and variant association endpoints accept approved assets only. A shared asset survives when one association is detached.
5. An unreferenced delete first marks the record `ORPHANED`, deletes exact known keys, then marks it `PURGED`. Failed cleanup remains retryable through the admin reconciliation action.

External R2 requests never run inside a PostgreSQL transaction. The database records recoverable states for partial failures.

## Admin APIs

- `GET/POST /api/admin/media`: list assets or stage one multipart `file` upload.
- `PATCH/DELETE /api/admin/media/[id]`: approve or delete an unreferenced asset.
- `GET /api/admin/media/[id]/content`: authenticated preview, including staged media.
- `POST /api/admin/media/reconcile`: retry orphan and staging cleanup.
- `POST/DELETE /api/admin/products/[id]/media`: attach, reorder, or detach shared product media.
- `POST/DELETE /api/admin/variants/[id]/media`: attach, reorder, or detach variant media.
- `GET /api/media/[id]`: public delivery for approved media only.

All admin routes require the existing server session, MFA, permission, same-origin mutation check, and rate limits.

## Disposable R2 verification

The real R2 verification script refuses a bucket whose name does not clearly contain `test`, `dev`, `staging`, `sandbox`, or `disposable`. It also requires two explicit flags:

```powershell
$env:MEDIA_STORAGE_RUNTIME='r2'
$env:RUN_R2_INTEGRATION='true'
$env:R2_TEST_BUCKET_CONFIRMED='true'
npm run test:r2
```

The script writes two random staging objects, checks metadata and downloaded bytes, and deletes those exact keys in a `finally` block. Never point it at a production bucket.

## Production gates

- Verify bucket privacy and token scope.
- Configure secret rotation and deployment secret storage.
- If direct delivery is desired, deploy a Worker/CDN rule that serves `public/` only; otherwise retain the approved-state application route.
- Run the disposable verification against a designated non-production bucket.
- Add monitoring for `ORPHANED`, `R2_UPLOAD_FAILED`, `R2_PURGE_FAILED`, and `STAGING_CLEANUP_PENDING` records.
- Confirm retention and deletion policy with the owner before scheduling automatic purge jobs.

This integration does not enable production checkout.
