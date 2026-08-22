# Security Policy

## Scope

QualityOps Hub is a public portfolio project, not a production or multi-tenant service. Security reports are welcome for the API, report adapters, token lifecycle, Pipeline Lab, database handling, workflows, hosted demo, and public assets.

## Reporting a vulnerability

Do not open a public issue that contains a credential, raw token, exploit payload with sensitive data, or private infrastructure detail. Use the repository's private GitHub Security Advisory flow. If that channel is unavailable, retain the report privately and do not post the sensitive material publicly.

No real credential should ever be used with this project. If one is exposed, revoke it at its provider before doing anything else.

## Supported status

The current published version is **v1.0.0**. The public Render/Neon deployment is a portfolio demo and has no formal security support window. Fixes are evaluated against the latest `main` branch.

## Demo data

All committed and generated examples must remain fictional and synthetic. Local PostgreSQL credentials are explicitly demo-only and must not be reused outside the local Compose environment.
