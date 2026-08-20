# Test report contract

`POST /api/products/:productKey/test-reports` accepts JSON and requires `Authorization: Bearer <product-token>`.

The envelope contains optional `productKey`, `reportFormat`, `source`, `suiteType`, `branch`, `commitSha`, nullable pipeline/job identifiers and URLs, `jobName`, `environment`, ISO `startedAt`/`finishedAt`, and `report`. When supplied, `productKey` must match the endpoint path. Shared Zod schemas reject malformed envelopes and product/format mismatches.

External browser workflows send `source=GITHUB_ACTIONS`; the API normalizes that source to `origin=EXTERNAL_CI`. Their pipeline, job, and artifact URLs must be absolute HTTPS URLs. Tokens are accepted only through the Bearer header and are never part of this envelope.

## Formats

### `mochawesome`

ShopSphere accepts a real Mochawesome JSON document. The adapter recursively walks `results`, nested `suites`, and each `tests` entry. Root totals are not authoritative. It extracts file, suite path, title, duration, state and error.

### `playwright-json-v1`

ServiceDesk uses an intentionally versioned public projection:

```json
{
  "version": "playwright-json-v1",
  "framework": "Playwright",
  "infrastructureError": null,
  "tests": [{
    "file": "demo.spec.ts",
    "suitePath": ["Tickets"],
    "title": "opens ticket",
    "status": "passed",
    "durationMs": 120,
    "error": null
  }]
}
```

The API is not coupled to Playwright's unversioned internal reporter shape.

### `mobile-e2e-json-v1`

PocketWallet requires `version`, `executionMode=MOBILE_HARNESS_DEMO`, totals, `infrastructureError`, and test entries. It never represents a device or Appium session.

## Normalized status

The common statuses are `PASSED`, `FAILED`, `SKIPPED`, `ERROR`, and `NOT_EXECUTED`. Infrastructure startup failures preserve a known suite total when available while forcing all execution counters to zero except `errors`.

The stable idempotency identity is product + pipeline ID + job ID + report format. Replaying identical report content returns the existing execution with HTTP 200; submitting different content under that identity returns HTTP 409.
