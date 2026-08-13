# Pipeline Lab

Pipeline Lab is a local/demo-only feature. Set `DEMO_PIPELINE_LAB_ENABLED=true` to register its API routes.

The UI accepts three enums only: product, `SMOKE`/`REGRESSION`, and `SUCCESS`/`FUNCTIONAL_FAILURE`/`INFRASTRUCTURE_FAILURE`. The server maps these values to three fixed runner paths. Client input never becomes a command, executable or path, and child processes run without a shell.

Jobs expose `QUEUED`, `RUNNING`, `PROCESSING_REPORT`, `COMPLETED`, and `FAILED`. The browser polls at a moderate interval. Each job writes raw report, normalized report, metadata and sanitized logs below its generated run ID. No token is written to artifacts or logs.

The Cypress and Playwright modes execute actual browser tests against clean-room HTML targets. PocketWallet is a Node `MOBILE_HARNESS_DEMO`, never a claimed Android execution.
