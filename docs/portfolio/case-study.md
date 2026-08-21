# QualityOps Hub — portfolio case study

## Problem

Test automation produces evidence in several places: the CI conclusion, framework-specific reports, retained artifacts, logs, and historical runs. Those sources answer different questions and are difficult to compare directly. A green or red job alone does not explain whether a failure is new, persistent, recovered, functional, or caused by infrastructure.

## Context

QualityOps Hub is an independent, open-source portfolio project. It models three fictional products and uses only synthetic data. The goal was to demonstrate a complete, auditable TestOps path without claiming enterprise scale or connecting to a real organization.

## Design goals

- Normalize reports without erasing framework traceability.
- Keep functional failures separate from infrastructure errors.
- Preserve the relationship between CI, artifact, ingestion, execution, and dashboard.
- Make repeated CI delivery safe and deterministic.
- Keep the hosted free-tier boundary honest.
- Present limitations and synthetic data explicitly.

## Architecture

GitHub Actions runs Cypress or Playwright, preserves the resulting report artifact, and submits a product-authenticated envelope to Fastify on Render. Zod validates the envelope and selects a versioned adapter. The adapter returns a normalized execution containing pipeline metadata, suites, cases, counts, durations, and sanitized diagnostics. Neon PostgreSQL stores the transaction. The React dashboard reads the same-origin API and presents the latest official results, history, and Regression Delta.

PocketWallet uses a deterministic `MOBILE_HARNESS_DEMO` report to exercise mobile normalization and explicit infrastructure-error semantics. It is not represented as a real device run.

## Implementation

The monorepo contains a React/Vite frontend, Fastify API, shared TypeScript contracts, PostgreSQL migrations, fixed demo runners, and Playwright acceptance tests. Report adapters support Mochawesome, `playwright-json-v1`, and `mobile-e2e-json-v1`.

Ingestion authenticates one token against one product, calculates stable identity and content hashes, and writes the execution graph in a transaction. An identical replay returns the existing execution; different content for the same identity returns HTTP 409. Official metrics use only authenticated `GITHUB_ACTIONS` executions with `EXTERNAL_CI` origin.

## Challenges

The hardest boundary was separating presentation from evidence. Seed data makes the interface useful before a real pipeline exists, while hosted preview demonstrates the flow on the free tier. Neither can be allowed to inflate official metrics. The application therefore keeps seeded, local-demo, and external-CI origins explicit and computes official status from persisted external evidence.

A functional test failure created another important edge case: the workflow still needed to preserve its raw report and ingest it before ending red. The ShopSphere workflow records the runner conclusion, uploads and ingests the report, and only then propagates the expected failure.

## Trade-offs

- **In-process demo queue:** simple and bounded for one instance, but without distributed recovery.
- **Versioned custom Playwright JSON:** explicit and stable for the project, but not a universal Playwright report standard.
- **External browser CI:** appropriate for Render Free and public artifacts, but browser execution is not initiated by the hosted service.
- **PostgreSQL without object storage:** normalized history is durable, while raw report retention depends on GitHub Actions or ignored local artifacts.
- **No user identity model:** keeps the portfolio scope focused, but prevents multi-user or tenant workflows.

## Security

Integration tokens are product-scoped and stored only as salted scrypt hashes. Raw values are not part of report payloads. Report bodies are bounded and schema-validated, database calls are parameterized, and writes are transactional. Pipeline Lab accepts enums that map to fixed runner files and never builds arbitrary commands. Diagnostics are sanitized before persistence, production is same-origin, and defensive headers are enabled.

Public-release scans check corporate references, secret patterns, Git history, public paths, public assets, and Git identities.

## Testing strategy

Unit tests cover quality semantics, adapters, security helpers, polling, and shared contracts. PostgreSQL integration tests cover accepted formats, valid and invalid tokens, product isolation, revoked tokens, idempotent replay, content conflicts, and demo boundaries. Playwright tests exercise complete local pipelines, primary portfolio routes, pagination, responsive overflow, and keyboard navigation. A production-like smoke suite validates migration, bootstrap, serving, readiness, and hosted behavior.

## CI/CD

The platform workflow runs a frozen install, lint, typecheck, tests, build, scans, production smoke, and Playwright on pushes and pull requests. Three manually dispatched demo workflows keep portfolio evidence deliberate.

The public browser proof consists of:

- ShopSphere success: 5 executed, 5 passed.
- ServiceDesk success: 5 executed, 5 passed.
- ShopSphere functional failure: 5 executed, 4 passed, 1 failed.

Reports are uploaded before ingestion. The expected functional-failure job ends red only after those evidence steps succeed.

## Outcome

The hosted dashboard reports the latest official external-CI results as 10 executed, 9 passed, 1 failed, 0 infrastructure errors, 90% approval, and a 90% Quality Score. ShopSphere Regression Delta identifies one new failure. Public links connect each proof workflow to its artifact and normalized dashboard execution.

Live demo: https://qualityops-hub.onrender.com

## What I learned

The project reinforced that trustworthy quality reporting depends more on boundaries than on charts. Origin, identity, error semantics, replay behavior, and traceability must be explicit before an aggregate metric is meaningful. It also showed that a constrained hosting plan can produce an honest architecture when browser execution, persistence, and preview behavior are separated instead of simulated.

## Next possibilities

Potential future work includes a longer-history Flaky Test Radar, validated Automation Plan import, permission-scoped user authentication, durable object storage with retention rules, and distributed job/rate-limit infrastructure. These are possibilities, not implemented features in v1.0.0.
