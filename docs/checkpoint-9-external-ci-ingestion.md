# Checkpoint 9: external CI ingestion

Status: **complete**. External CI is active and the three public proof runs are persisted in the hosted dashboard.

## Implemented boundary

ShopSphere Cypress/Mochawesome and ServiceDesk Playwright/`playwright-json-v1` workflows now preserve real reports as GitHub Actions artifacts and submit them to the existing authenticated public endpoint. The envelope includes `productKey`, the explicit report format, `source=GITHUB_ACTIONS`, branch, commit, workflow/job identities and URLs, artifact URL, environment, and real timestamps.

Tokens remain independent per product, stored as hashes, shown once when created, restricted to one active token, rotatable, and revocable. Missing, invalid, revoked, cross-product, and format-mismatched credentials/reports are rejected. Identical content for the same pipeline/job/format identity returns the original execution; different content returns HTTP 409.

## Data truth model

- `SEEDED_DEMO` supplies clearly labeled sample history only.
- `DEMO_PIPELINE` supplies real local runners or a non-persisting hosted flow preview.
- `EXTERNAL_CI` is created only from authenticated `GITHUB_ACTIONS` reports.

Only `EXTERNAL_CI` feeds the official latest product execution, aggregate approval, quality score, official freshness, and external-CI Regression Delta. The history screen may still show all origins with explicit labels. Hosted preview never creates a report or official execution.

The hosted status is `EXTERNAL_CI_ACTIVE` because both ShopSphere and ServiceDesk have persisted external-CI executions. That state is derived from database evidence, not configuration or a hard-coded claim.

## Workflow guarantees

- Exact Node and pnpm versions with a frozen lockfile.
- Manual demo triggers prevent documentation and ordinary code changes from starting browser runs.
- Raw report artifact upload occurs before ingestion.
- ShopSphere functional failure is ingested and preserved, then propagates a failed job conclusion.
- Missing report, failed artifact upload, or failed ingestion fails the job.
- No PAT, database credential, Render credential, or Neon credential is used by the workflows.
- `platform.yml` validates push to `main`, pull request, and manual dispatch.

## Public proof

| Scenario | Workflow | Artifact | Normalized execution |
|---|---|---|---|
| ShopSphere success — 5/5 passed | [Run 32431118788](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431118788) | [Mochawesome](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431118788/artifacts/9429101193) | [Execution](https://qualityops-hub.onrender.com/executions/a8a65b5d-17b2-4714-b3c1-d2192b945963) |
| ServiceDesk success — 5/5 passed | [Run 32431321053](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431321053) | [Playwright JSON](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431321053/artifacts/9429173727) | [Execution](https://qualityops-hub.onrender.com/executions/6899dec4-d7d6-4fe9-ba89-7edf30b88d1c) |
| ShopSphere functional failure — 4/5 passed | [Expected failed run 32431559619](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431559619) | [Mochawesome](https://github.com/luanaabastos/qualityops-hub/actions/runs/32431559619/artifacts/9429251422) | [Execution](https://qualityops-hub.onrender.com/executions/af12fdee-6860-4916-a35c-9fce60022556) |

The official aggregate after these runs is 10 executed, 9 passed, 1 failed, 0 infrastructure errors, 90% approval, and a 90% Quality Score. ShopSphere reports one new failure in Regression Delta.
