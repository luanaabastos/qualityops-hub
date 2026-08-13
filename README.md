# QualityOps Hub

QualityOps Hub is an independent open-source TestOps portfolio project that demonstrates how automated test results can become traceable quality signals.

All products, users, executions and integrations in this repository are fictional and exist only for demonstration. The interface marks data-bearing pages with `DEMO DATA`.

## What is implemented

- Product overview with approval, freshness and execution indicators
- Synthetic history for ShopSphere, ServiceDesk and PocketWallet
- Passed, failed, stale and infrastructure-error outcomes
- Regression delta based on stable scenario identity
- Product and status filters with an explicit empty state
- Accessible desktop navigation and a keyboard-managed mobile drawer
- Health and demo-mode readiness endpoints
- Responsive coverage across five viewports
- Unit, integration and Playwright desktop/mobile tests
- Local screenshot evidence with SHA-256 manifest generation

Automation coverage is intentionally not inferred. Until scenario coverage is configured, the dashboard displays `Coverage not configured`.

## Prerequisites

- Node.js `20.20.1`
- pnpm `10.34.5`

The versions are pinned in `package.json`. [Volta](https://volta.sh/) is recommended for local version management.

```bash
volta install node@20.20.1 pnpm@10.34.5
node --version
pnpm --version
```

## Quick start

```bash
pnpm install --frozen-lockfile
pnpm demo:start
```

Open:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/api/health`
- Readiness: `http://localhost:3001/api/readiness`

Check or stop the demo with:

```bash
pnpm demo:status
pnpm demo:stop
```

PostgreSQL and MinIO are planned persistence dependencies and are available through `docker-compose.yml`. They are not required by the current in-memory demo mode.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm scan:references
pnpm scan:secrets
```

With the demo running, generate local visual evidence using:

```bash
pnpm evidence:capture
```

Evidence is written under `artifacts/frontend-review/` and is ignored by Git.

## Architecture

The monorepo contains:

- `apps/web`: React, TypeScript and Vite interface
- `apps/api`: Fastify demo API
- `packages/shared`: normalized schemas and metric helpers
- `prisma`: planned PostgreSQL persistence schema
- `tests`: Playwright acceptance coverage

The public processing model is:

`Code change → GitHub Actions → Automated Tests → Test Report → Artifact → QualityOps API → Normalizer → Persistence → Dashboard`

## Windows runtime resolution

When multiple Node.js installations exist on Windows, verify the command order with `where.exe node` and `where.exe pnpm`. Volta shims should appear before conflicting global installations in `PATH`. After correcting the order, open a new terminal and confirm both pinned versions before installing dependencies.

This machine-level adjustment is separate from the project configuration; do not relax the Node engine requirement to hide a local PATH conflict.

## Roadmap

- Connect the Prisma schema to PostgreSQL persistence
- Implement authenticated ingestion and token lifecycle
- Add background jobs and MinIO evidence storage
- Replace placeholder coverage and integration pages with verified workflows
- Add CI automation after repository publication is explicitly authorized

No remote repository or publishing workflow is configured by this checkpoint.
