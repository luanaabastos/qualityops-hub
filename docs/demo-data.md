# Demo data

All data is fictional. Product records are seeded idempotently, followed by an intentional 12-execution initial history marked `SEEDED_DEMO`. Each product starts with four useful outcomes that demonstrate success, functional regression or recovery, and infrastructure recovery without filling the public view with repetitive development runs. Runs launched in Pipeline Lab are actual local runner results and are marked `DEMO_PIPELINE`.

The labels “Seeded demo history” and “Live demo run” prevent the two origins from being presented as equivalent. Both remain synthetic portfolio data.

ShopSphere and ServiceDesk use clean-room browser targets included in `apps/web/public/demo-targets`. PocketWallet uses `executionMode=MOBILE_HARNESS_DEMO` and does not claim Android, Appium or WebdriverIO device execution.

Freshness compares the latest persisted completion timestamp with the product target: at or below the target is `FRESH`, up to twice the target is `STALE`, and older or missing is `OVERDUE`.

Automation Coverage is a separate planning dataset, not a value inferred from executions. The fictional baseline contains 40 eligible scenarios and 28 automated scenarios: ShopSphere 14/18, ServiceDesk 9/12, and PocketWallet 5/10.

`pnpm demo:reset -- --confirm-local-demo-reset` truncates only execution-related data in the local `qualityops_dev` database, restores the same 12 seeded executions, removes only ignored project demo artifacts, and restarts the local demo. Both the script and the API-side reset refuse a non-local host or another database name. No reset route is exposed by the hosted application.
