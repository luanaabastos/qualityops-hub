# GitHub Actions strategy

The repository contains one platform validation workflow and three manually dispatched demo-report workflows. Node.js `20.20.1`, pnpm `10.34.5`, frozen installs, bounded timeouts, and read-only repository access are fixed in every workflow.

## Platform validation

`.github/workflows/platform.yml` runs on pushes to `main`, pull requests, and manual dispatch. It creates isolated PostgreSQL databases and runs lint, typecheck, unit and integration tests, build, public-release scans, production smoke, and Playwright browser acceptance. It has no deployment or secret-provisioning step.

## External browser CI

ShopSphere and ServiceDesk run only after an explicit `workflow_dispatch`:

```text
GitHub-hosted runner
-> real Cypress / Playwright execution
-> real versioned JSON report
-> retained GitHub Actions artifact
-> product-authenticated HTTPS ingestion
-> Render API
-> Neon PostgreSQL
-> dashboard
```

ShopSphere accepts `SUCCESS` and `FUNCTIONAL_FAILURE`. A functional failure produces and ingests its 5-test Mochawesome report, retains the artifact, and then leaves the workflow job failed. The regression is not hidden. ServiceDesk currently runs its defined 5-test `SUCCESS` scenario and submits `playwright-json-v1`.

Each ingestion persists the workflow run URL, current job URL, artifact URL, branch, commit, and real start/finish timestamps. The helper uses the automatic, job-scoped `GITHUB_TOKEN` only to resolve the current public job URL. No personal access token is required. The product Bearer token is sent only in the API request header and is never included in the report envelope or safe completion log.

PocketWallet remains a manual `MOBILE_HARNESS_DEMO` artifact workflow. It is not represented as an external browser or mobile-device execution and does not submit to the external-CI endpoint.

## Repository configuration boundary

The only repository secrets required by the browser workflows are:

- `QUALITYOPS_SHOPSPHERE_TOKEN`
- `QUALITYOPS_SERVICEDESK_TOKEN`

The workflow uses `QUALITYOPS_URL=https://qualityops-hub.onrender.com` as public configuration. Do not create `DATABASE_URL`, `DEMO_SYSTEM_TOKEN`, Neon credentials, Render credentials, or a PAT in GitHub Actions.

Token values are created locally against the hosted PostgreSQL database, displayed exactly once, and stored by the application only as salted scrypt hashes. There can be only one active token per product; rotation revokes the former token. Never paste a token into chat, a shell history file, documentation, a commit, a workflow input, or a workflow log.

## Manual activation procedure

Do not dispatch either browser workflow until the current application commit has been manually deployed on the existing Render service and its readiness endpoint is healthy.

1. In a private local terminal, supply the existing Neon `DATABASE_URL` without saving it in this repository or pasting it into chat.
2. Run the two acknowledged one-time creation commands:

   ```powershell
   pnpm integration-token:create -- --product shopsphere --acknowledge-plaintext-once
   pnpm integration-token:create -- --product servicedesk --acknowledge-plaintext-once
   ```

3. For each command, copy the displayed token directly to GitHub: **Repository Settings -> Secrets and variables -> Actions -> New repository secret**.
4. Store the ShopSphere value as `QUALITYOPS_SHOPSPHERE_TOKEN` and the ServiceDesk value as `QUALITYOPS_SERVICEDESK_TOKEN`. Do not interchange the values.
5. Clear the local `DATABASE_URL` environment value and close the private terminal after both secrets are saved.
6. Confirm only `SECRETS_CONFIGURED`; do not send either value.

If an active token already exists, use `integration-token:rotate` with the same acknowledgement flag and replace only the corresponding GitHub secret. To disable access, use `integration-token:revoke -- --product <product>`.

After the human confirmation, the authorized proof sequence is ShopSphere `SUCCESS`, ServiceDesk `SUCCESS`, and ShopSphere `FUNCTIONAL_FAILURE`. Workflow run, job, artifact, ingestion response, normalized execution identity, commit, and counts must be collected from those real runs before external CI can be declared complete.
