# Security review

QualityOps Hub is a public portfolio demo. These controls reduce risk in that bounded scope; they do not make the application production-ready or multi-tenant.

## Implemented controls

### Authentication and tokens

Integration tokens are product-scoped opaque values. The database stores a random salt, a scrypt-derived hash, and a non-secret prefix; it never stores the raw value. Create and rotate require an explicit acknowledgement and display the token once. A database constraint permits only one active token per product. Revoked tokens fail authentication, cross-product tokens are rejected, and hash comparison is timing-safe. Authorization headers are not logged.

### HTTP boundary

- Report bodies are limited to 10 MiB.
- Route parameters and request bodies are validated with Zod.
- The hosted Render application uses same-origin web/API requests and registers no CORS policy by default; development allows only its two explicit local origins.
- Responses set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Unexpected ingestion failures return a generic message instead of an internal diagnostic.
- There is no file-upload endpoint; the API accepts a validated JSON body.

### Pipeline Lab and command execution

Pipeline Lab is disabled unless `DEMO_PIPELINE_LAB_ENABLED=true`. Requests contain enums that map to three fixed runner files. No arbitrary command, executable, argument list, URL, or filesystem path is accepted. Child processes use argument arrays with `shell: false`.

### Database and idempotency

Database operations use parameterized `pg` queries. Execution, pipeline, suite, and case writes share one transaction. An advisory transaction lock serializes a stable ingestion identity. Identical content returns the existing execution; different content for that identity returns HTTP 409.

### Reports and diagnostics

Adapters validate each supported version before normalization. Home-directory prefixes and file URLs are removed from diagnostics before persistence. Execution Details exposes normalized data and relative artifact metadata, never the raw report. Generated reports remain in ignored local project directories.

### Demo reset

The reset command requires an explicit confirmation flag, accepts only a loopback database host named `qualityops_dev`, and removes only project demo-run artifacts. It never deletes a Docker volume, runs a global prune, or addresses external containers.

## Known limitations

- There is no application-level or distributed rate limiter. Do not expose this local API directly to the internet.
- Tokens have no automatic expiry policy; rotation and revocation are explicit operations.
- The background job queue is in-process and has no multi-instance coordination or crash recovery.
- There is no user authentication, role model, tenant boundary, or audit-log service.
- Object storage is not implemented; raw reports are local files with no retention service.
- CORS is a browser control, not an authentication boundary.
- Hosted transport and secret storage depend on Render, Neon, and GitHub Actions configuration outside this repository.
- Dependency vulnerability intelligence is not available from an offline install alone and must be reviewed before a hosted release.

## Local credentials

The PostgreSQL username and password in Compose are intentionally obvious, local-only demo values. They must never be reused for a remote database or production-like environment.
