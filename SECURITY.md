# Security Policy

## Scope

QualityOps Hub is a local portfolio demo, not a production service. Security reports are still welcome for the API, report adapters, token lifecycle, Pipeline Lab, database handling, workflows, and public assets.

## Reporting a vulnerability

Do not open a public issue that contains a credential, raw token, exploit payload with sensitive data, or private infrastructure detail. After the repository is published, use the repository's private GitHub Security Advisory flow. Until that channel exists, retain the report privately and do not post the sensitive material publicly.

No real credential should ever be used with this project. If one is exposed, revoke it at its provider before doing anything else.

## Supported status

The current status is **Portfolio Preview**. There is no production deployment or security support window. Fixes are evaluated against the latest `main` branch.

## Demo data

All committed and generated examples must remain fictional and synthetic. Local PostgreSQL credentials are explicitly demo-only and must not be reused outside the local Compose environment.
