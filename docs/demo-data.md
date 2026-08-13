# Demo data

All data is fictional. Product records are seeded idempotently, followed by a small initial history marked `SEEDED_DEMO`. Runs launched in Pipeline Lab are actual local runner results and are marked `DEMO_PIPELINE`.

The labels “Seeded demo history” and “Live demo run” prevent the two origins from being presented as equivalent. Both remain synthetic portfolio data.

ShopSphere and ServiceDesk use clean-room browser targets included in `apps/web/public/demo-targets`. PocketWallet uses `executionMode=MOBILE_HARNESS_DEMO` and does not claim Android, Appium or WebdriverIO device execution.

Freshness compares the latest persisted completion timestamp with the product target: at or below the target is `FRESH`, up to twice the target is `STALE`, and older or missing is `OVERDUE`.
