# Architecture

The platform uses a small monorepo: a React client, a Fastify API, shared Zod contracts, fixed local runners and PostgreSQL. Framework-specific parsing stays in adapters and never enters HTTP route handlers.

```text
Pipeline Lab
  -> background DemoJobService
  -> allow-listed runner process
  -> artifacts/demo-runs/<runId>/raw-report.json
  -> POST /api/products/:productKey/test-reports (Bearer token)
  -> AdapterRegistry -> ReportAdapter.validate/normalize
  -> normalized Execution / Suite / TestCaseResult / PipelineMetadata
  -> PostgreSQL transaction
  -> dashboard polling every five seconds
```

The runner does not write execution rows. It submits through the same API boundary intended for future CI systems.

## Persistence

The API runs ordered SQL migrations on startup and uses parameterized `pg` queries. Ingestion stores the execution, pipeline metadata, suites and cases in one transaction. Products are seeded idempotently. Initial history has origin `SEEDED_DEMO`; new jobs have `DEMO_PIPELINE`.

## Background execution

`POST /api/demo/runs` creates a persisted `QUEUED` job and returns immediately. An in-process worker advances through `RUNNING`, `PROCESSING_REPORT`, and `COMPLETED` or `FAILED`. Redis is intentionally unnecessary for this local-only checkpoint.

## Reliability semantics

Functional assertions produce `FAILED`. A runner that never starts produces `ERROR`, `executed=0`, `failed=0`, `errors>=1`, and a null approval rate. Stable identities combine framework, normalized file, suite path and title.
