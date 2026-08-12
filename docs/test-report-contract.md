# Test Report Contract

## Normalized execution model

```json
{
  "executionId": "exec-001",
  "productKey": "shopsphere",
  "suite": "Regression",
  "status": "FAILED",
  "startedAt": "2026-08-12T06:00:00.000Z",
  "finishedAt": "2026-08-12T06:14:37.000Z",
  "pipeline": {
    "provider": "github-actions",
    "repository": "example/shopsphere-demo",
    "branch": "main",
    "commitSha": "abc1234",
    "pipelineId": "1234",
    "pipelineUrl": "https://example.test/workflows/1234",
    "jobId": "5678",
    "jobName": "cypress-regression",
    "jobUrl": "https://example.test/jobs/5678",
    "artifactUrl": "https://example.test/artifacts/5678",
    "environment": "staging",
    "source": "push",
    "suiteType": "Regression"
  },
  "tests": [
    {
      "name": "cart-checkout-success",
      "status": "FAILED",
      "durationMs": 18200,
      "scenarioId": "SCN-015",
      "error": {
        "type": "AssertionError",
        "message": "expected total to equal 149.90"
      }
    }
  ]
}
```

## Rules

- Infrastructure errors are separated from functional failures.
- Statuses must normalize to PASSED, FAILED, SKIPPED, ERROR and NOT_EXECUTED.
- The execution identity is stable by product + pipeline + job + format + content hash.
- Idempotent ingestion must return 409 Conflict for same key with different content.
