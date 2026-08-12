# GitHub Actions

## Public workflows

The repository includes a platform workflow and per-product demo workflows.

### Platform workflow checklist

- lint
- typecheck
- unit tests
- integration tests
- e2e tests
- build
- secret scanning

### Demo product workflows

- ShopSphere uses Cypress in a real public workflow.
- ServiceDesk uses Playwright in a real public workflow.
- PocketWallet uses a Node-based mobile harness explicitly labeled `MOBILE HARNESS DEMO`.

## Manual trigger

The workflow dispatch entry point supports selecting a product, suite and failure mode for demonstration purposes.

```yaml
workflow_dispatch:
  inputs:
    product:
      type: choice
      options: [shopsphere, servicedesk, pocketwallet]
    suite:
      type: choice
      options: [Regression, Smoke, E2E, Mobile]
    failureMode:
      type: choice
      options: [none, functional-failure, infrastructure-failure]
```
