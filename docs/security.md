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

## Dependency build-script policy

The project intentionally authorizes only the build scripts required by the local toolchain.

- `esbuild` is allowed because Vite and the React/Vitest toolchain use it to compile and bundle frontend assets.
- No other dependency is approved to run lifecycle scripts in this checkpoint.
- This allows deterministic installs and avoids arbitrary execution from unrelated packages.
- The whitelist is kept in the root workspace configuration and should be reviewed whenever a new dependency introduces a native build step.

## Notes

- Secrets are never stored in plain text.
- The API does not expose hashes, raw headers or private audit details.
- Token rotation and revocation are supported by design.
