# Checkpoint 9 plan: external CI ingestion

Status: plan only. No workflow, remote credential, integration token, GitHub secret, or deployment change is included in this checkpoint.

## Objective

Connect real browser automation to the existing public ingestion boundary:

```text
GitHub Actions
-> Cypress / Playwright
-> versioned report artifact
-> authenticated ingestion
-> Render API
-> Neon PostgreSQL
-> dashboard and Regression Delta
```

PocketWallet remains explicitly identified as `MOBILE_HARNESS_DEMO`.

## Proposed delivery sequence

1. Define least-privilege, product-scoped ingestion tokens and an explicit rotation/revocation procedure.
2. Add separate allow-listed workflows for ShopSphere Cypress and ServiceDesk Playwright; do not run them in the Render service.
3. Generate the existing `mochawesome` and `playwright-json-v1` contracts and retain the raw reports as workflow artifacts.
4. Submit reports to the public API only after the corresponding test command and report validation complete.
5. Use stable pipeline/job identity so identical delivery is idempotent and changed content returns HTTP 409.
6. Mark accepted runs as `EXTERNAL_CI`, preserving a visible distinction from `SEEDED_DEMO` and local `DEMO_PIPELINE` history.
7. Add failure-safe workflow behavior: test failures may still publish a valid report, while missing/invalid reports must not fabricate an execution.
8. Validate token rejection/revocation, adapter contracts, dashboard polling, execution details, Regression Delta, artifact retention, and secret redaction.
9. Run all local gates and public-release scans before requesting a separately authorized remote configuration step.

## Authorization boundary

The implementation phase must not create personal access tokens. Creation of repository secrets, hosted integration tokens, workflow activation, or a Render redeploy requires explicit authorization at that time.
