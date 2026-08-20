# Checkpoint 9: external CI ingestion

Status: implementation complete locally; remote activation and proof are waiting for human secret configuration.

## Implemented boundary

ShopSphere Cypress/Mochawesome and ServiceDesk Playwright/`playwright-json-v1` workflows now preserve real reports as GitHub Actions artifacts and submit them to the existing authenticated public endpoint. The envelope includes `productKey`, the explicit report format, `source=GITHUB_ACTIONS`, branch, commit, workflow/job identities and URLs, artifact URL, environment, and real timestamps.

Tokens remain independent per product, stored as hashes, shown once when created, restricted to one active token, rotatable, and revocable. Missing, invalid, revoked, cross-product, and format-mismatched credentials/reports are rejected. Identical content for the same pipeline/job/format identity returns the original execution; different content returns HTTP 409.

## Data truth model

- `SEEDED_DEMO` supplies clearly labeled sample history only.
- `DEMO_PIPELINE` supplies real local runners or a non-persisting hosted flow preview.
- `EXTERNAL_CI` is created only from authenticated `GITHUB_ACTIONS` reports.

Only `EXTERNAL_CI` feeds the official latest product execution, aggregate approval, quality score, official freshness, and external-CI Regression Delta. The history screen may still show all origins with explicit labels. Hosted preview never creates a report or official execution.

The hosted status remains `EXTERNAL_CI_INTEGRATION_PENDING` until both ShopSphere and ServiceDesk have at least one persisted external-CI execution. It becomes `EXTERNAL_CI_ACTIVE` from database evidence, not from configuration or a hard-coded claim.

## Workflow guarantees

- Exact Node and pnpm versions with a frozen lockfile.
- Manual demo triggers prevent documentation and ordinary code changes from starting browser runs.
- Raw report artifact upload occurs before ingestion.
- ShopSphere functional failure is ingested and preserved, then propagates a failed job conclusion.
- Missing report, failed artifact upload, or failed ingestion fails the job.
- No PAT, database credential, Render credential, or Neon credential is used by the workflows.
- `platform.yml` validates push to `main`, pull request, and manual dispatch.

## Remaining authorized boundary

No hosted integration token or GitHub Actions secret is created by this implementation phase. Follow [the manual activation procedure](github-actions.md), then provide only `SECRETS_CONFIGURED`. Real workflow URLs, artifacts, ingestion results, dashboard state, and final completion declarations remain pending until the three proof runs finish.
