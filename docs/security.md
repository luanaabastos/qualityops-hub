# Security

## Principles

- Input validation through Zod schemas
- Secure headers added by the API layer
- Hashing for ingestion tokens and session secrets
- Rate limiting and abuse protections
- Upload validation for binary evidence files
- Audit trail for privileged operations without storing raw secrets

## Local demo bootstrap

The project uses synthetic users and fictitious products. For local demonstration, the bootstrap process should create an `owner@qualityops.local` owner user without hardcoded production secrets.

## Notes

- Secrets are never stored in plain text.
- The API does not expose hashes, raw headers or private audit details.
- Token rotation and revocation are supported by design.
