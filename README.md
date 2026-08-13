# QualityOps Hub

QualityOps Hub is an independent, clean-room TestOps portfolio platform. It runs fictional browser and harness suites, ingests their real structured reports through an authenticated API, normalizes the results, persists them in PostgreSQL, and refreshes a dashboard.

All products, test cases, users, pipelines and data are fictional. PocketWallet is explicitly a `MOBILE_HARNESS_DEMO`; it is not a real Android, Appium or WebdriverIO execution.

## Implemented flow

```text
Demo runner -> framework report -> local artifact -> authenticated ingestion API
-> report adapter -> normalized execution -> PostgreSQL -> polling dashboard
```

- ShopSphere: Cypress 15.20.1 with real Mochawesome 7.1.4 JSON
- ServiceDesk: Playwright with the versioned `playwright-json-v1` contract
- PocketWallet: deterministic Node harness with `mobile-e2e-json-v1`
- Product-scoped integration tokens with create, rotate and revoke lifecycle
- Idempotent ingestion and conflict detection
- Pipeline Lab with fixed allow-listed options and background jobs
- Regression delta, freshness, execution origin and full execution details
- Local artifacts and checkpoint evidence, all ignored by Git

## Prerequisites

- Node.js `20.20.1`
- pnpm `10.34.5`
- Docker with Compose for PostgreSQL 16
- Chromium installed for Playwright

The Node and pnpm versions are pinned exactly in `package.json`.

## Run locally

```bash
pnpm install --frozen-lockfile
pnpm demo:start
pnpm demo:status
```

Open `http://localhost:5173` and choose **Pipeline Lab**. `pnpm demo:start` starts PostgreSQL, migrates and seeds it, then starts the API and web app. Stop everything with `pnpm demo:stop`.

Pipeline Lab is a local/demo-only feature. Its routes exist only when `DEMO_PIPELINE_LAB_ENABLED=true`.

## Report ingestion

Create a product-scoped token. Its raw value is shown once and never stored:

```bash
pnpm integration-token:create --product shopsphere
pnpm integration-token:rotate --product shopsphere
pnpm integration-token:revoke --product shopsphere
```

Send a Bearer-authenticated report to `POST /api/products/:productKey/test-reports`. See [test-report-contract.md](docs/test-report-contract.md) and [adapters.md](docs/adapters.md).

## Quality semantics

Approval rate is `passed / executed`. It is `null` when no tests execute. Infrastructure errors are never counted as functional failures and display as “Infrastructure error — tests did not execute”.

Quality Score is intentionally auditable:

```text
approval rate - min(30, infrastructure errors * 10)
```

It is also `null` when no tests execute. Automation coverage remains `Coverage not configured`; the project does not invent coverage.

## Validation

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm scan:references
pnpm scan:secrets
```

Generate the ten Checkpoint 4 screenshots and SHA-256 manifest with `pnpm evidence:capture` while the demo is running.

## Repository layout

- `apps/api`: Fastify API, adapters, token security, jobs and PostgreSQL repository
- `apps/web`: React/Vite dashboard, Pipeline Lab and fictional targets
- `packages/shared`: Zod contracts, status semantics and comparison functions
- `demo-runners`: Cypress, Playwright and mobile harness implementations
- `prisma`: documented data model and ordered SQL migrations
- `tests`: Playwright platform acceptance tests
- `.github/workflows`: publishable workflow preparation only; no real secrets

No remote repository or publishing action is configured by this checkpoint.
