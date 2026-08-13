# Pipeline Lab

Pipeline Lab is a bounded demo feature. `pnpm demo:start` enables it locally; the hosted feature flag may enable the same fixed scenarios after a separately authorized deployment.

## Walkthrough

1. Run `pnpm demo:start`.
2. Open `http://localhost:5173`.
3. Select **Pipeline Lab**.
4. Select ShopSphere, ServiceDesk, or PocketWallet.
5. Select Smoke or Regression.
6. Select success, functional failure, or infrastructure failure.
7. Choose **Run demo pipeline**.
8. Watch Queued, Running, Processing report, and Completed.
9. Open the persisted execution.
10. Return to Overview and inspect the product's Regression Delta.

The server validates a strict three-enum object and maps it to fixed runner paths. Client input never becomes a command, executable, argument, URL, environment value, or path. Child processes execute without a shell, receive an environment allowlist, have a timeout, and are bounded by per-client cooldown/rate and a small concurrency limit.

Each job writes a raw report, normalized report, metadata, and sanitized log below its generated run ID in the ignored `artifacts/demo-runs` directory. Those files are ephemeral; normalized history lives in PostgreSQL. No raw integration or system token is written to those files.

ShopSphere and ServiceDesk execute real browser tests against fictional, clean-room HTML targets. PocketWallet is a deterministic Node `MOBILE_HARNESS_DEMO` and must never be described as a real Android or Appium run.

## Reset

To replace only local demo data and generated demo-run artifacts with predictable seeded history:

```bash
pnpm demo:reset -- --confirm-local-demo-reset
```

The confirmation is required because execution history is deleted. The command restarts this project's demo but does not delete its Docker volume or affect any external service.
