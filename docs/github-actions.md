# GitHub Actions strategy

Four workflow definitions are prepared locally. They have not been published or run on a remote repository.

## Platform validation

The platform workflow uses Node.js `20.20.1`, pnpm `10.34.5`, PostgreSQL 16, and read-only repository permissions. It performs:

1. frozen dependency install;
2. isolated test-database creation;
3. lint;
4. typecheck;
5. unit and PostgreSQL integration tests;
6. build;
7. reference, history, path, public-asset, and secret scans;
8. Chromium installation;
9. local API and web startup inside the runner;
10. Playwright acceptance tests.

The browser acceptance suite triggers the fixed local demo runners. Nothing is published, and the workflow has no deployment step.

## Demo report workflows

The ShopSphere, ServiceDesk, and PocketWallet workflows execute their runner and upload the resulting JSON as a workflow artifact. They intentionally stop there.

A GitHub-hosted runner cannot reach a developer's `localhost`. Remote ingestion remains disabled until the prepared hosted application is separately provisioned and deployed. A future authorized design may use a public `QUALITYOPS_URL` and a product-scoped `QUALITYOPS_INGEST_TOKEN` stored in the repository's secret manager. No such secret or endpoint is configured now.

## Publication boundary

Workflow files are preparation, not evidence that a GitHub repository, hosted API, or remote integration already exists.
