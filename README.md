# QualityOps Hub

QualityOps Hub is an independent open-source TestOps portfolio project created to reduce the manual work involved in monitoring automated tests.

Automated test results often live across CI pipelines, framework-specific reports, spreadsheets and evidence files.

QualityOps Hub centralizes those signals into one platform and transforms CI executions into history, coverage, traceability and quality indicators.

All applications, users, test data and integrations in this repository are fictional and created exclusively for demonstration purposes.

## Problem

Quality engineering teams spend too much time gathering test outcomes from fragmented reporting sources before they can make decisions. The result is slow incident triage, inconsistent quality signals and poor regression awareness.

## Solution

QualityOps Hub normalizes execution artifacts from different test frameworks into a common model, stores historical execution data and exposes a dashboard with quality indicators, regression tracking and evidence traceability.

## Architecture

The platform follows a monorepo model with a Vite React web application, a Fastify API and a shared package for schemas and domain contracts.

## Features

- Normalized execution model
- Product overview dashboard
- Historical execution search
- Regression delta tracking
- Flaky test radar
- Scenarios and coverage views
- Automation debt indicators
- CSV/XLSX import flow
- Video evidence management
- Demo data and synthetic pipelines
- GitHub Actions integration planning

## Demo

The repository includes synthetic demo products for ShopSphere, ServiceDesk and PocketWallet. Demo data is generated intentionally to show realistic quality trends without implying real-world usage.

## Screenshots

Screenshots are not included in the initial checkpoint. The project focuses on a clean, responsive shell and clear architecture proof.

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

## Tech Stack

- React + TypeScript + Vite
- Fastify + TypeScript + Zod
- PostgreSQL + Prisma
- MinIO for local object storage
- Vitest + Playwright
- GitHub Actions
- Docker + Docker Compose

## Testing Strategy

- Unit tests for shared logic
- Integration tests for API contracts
- E2E tests for UI shells and workflows
- Zero structural skips

## Security

The project is designed for educational and demo use with secure defaults: validation, rate limiting, secure headers, hashed tokens and audit-oriented APIs.

## Roadmap

- Expand product models and dashboards
- Add PostgreSQL and Prisma schemas
- Implement ingestion endpoints and token lifecycle
- Build demo data generation and pipeline simulations
- Add Playwright E2E coverage and GitHub Actions workflows

## License

This project is planned for a permissive open-source license. The current checkpoint leaves the final license choice open pending human review of MIT vs Apache-2.0 tradeoffs.

---

This checkpoint intentionally keeps the project public, synthetic and independent from any external repository or corporate context.
