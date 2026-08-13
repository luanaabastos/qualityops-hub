# Security

## Ingestion tokens

Tokens are product-scoped opaque values. The database stores a random salt, a scrypt-derived hash and a non-secret prefix; it never stores the raw value. Create and rotate commands print the raw token once. Revoked tokens fail authentication. Authorization headers are never logged.

## Pipeline Lab

Pipeline Lab is disabled unless `DEMO_PIPELINE_LAB_ENABLED=true`. Requests are Zod-validated enums and map to fixed internal runners. No arbitrary commands, arguments or filesystem paths are accepted. Processes use argument arrays with `shell=false`.

## Idempotency

The base identity hashes product key, explicit nullable pipeline ID, explicit nullable job ID and format. A separate content hash uses canonical JSON. Replaying identical content returns the existing ID; different content with the same base returns HTTP 409.

## Data exposure

Diagnostics redact personal home-directory prefixes before persistence or sanitized logs. Execution details expose artifact metadata but not the raw report. Local artifacts and evidence are ignored by Git and are included in reference/secret scans. Public documentation and versioned files must contain no personal absolute paths.

## Demo credentials

The PostgreSQL values in Compose are local-only demo credentials. Future `QUALITYOPS_URL` and `QUALITYOPS_INGEST_TOKEN` values must be provided through the CI secret store after publication authorization.
