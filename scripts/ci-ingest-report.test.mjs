import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExternalCiPayload, resolveCurrentJobUrl, submitExternalCiReport } from './ci-ingest-report.mjs';

const baseEnv = {
  QUALITYOPS_URL: 'https://qualityops.example',
  QUALITYOPS_PRODUCT: 'shopsphere',
  QUALITYOPS_REPORT_FORMAT: 'mochawesome',
  QUALITYOPS_REPORT_PATH: 'artifacts/demo-runs/ci-shopsphere/raw-report.json',
  QUALITYOPS_TOKEN: 'qoh_shopsphere_fixture-placeholder',
  QUALITYOPS_JOB_NAME: 'ShopSphere Cypress',
  QUALITYOPS_JOB_URL: 'https://github.com/example/qualityops/actions/runs/42/job/7',
  QUALITYOPS_ARTIFACT_URL: 'https://github.com/example/qualityops/actions/runs/42/artifacts/8',
  QUALITYOPS_STARTED_AT: '2026-08-20T10:00:00.000Z',
  QUALITYOPS_FINISHED_AT: '2026-08-20T10:01:00.000Z',
  QUALITYOPS_MODE: 'SUCCESS',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'example/qualityops',
  GITHUB_RUN_ID: '42',
  GITHUB_RUN_ATTEMPT: '1',
  GITHUB_JOB: 'cypress-report',
  GITHUB_REF_NAME: 'main',
  GITHUB_SHA: 'abc123',
  GITHUB_TOKEN: 'github-automatic-token-placeholder'
};

test('builds a versioned external-CI envelope with real workflow traceability', () => {
  const payload = buildExternalCiPayload(baseEnv, { results: [] }, baseEnv.QUALITYOPS_JOB_URL);
  assert.deepEqual(payload, {
    productKey: 'shopsphere',
    reportFormat: 'mochawesome',
    source: 'GITHUB_ACTIONS',
    suiteType: 'REGRESSION',
    branch: 'main',
    commitSha: 'abc123',
    pipelineId: '42',
    pipelineUrl: 'https://github.com/example/qualityops/actions/runs/42',
    jobId: 'cypress-report',
    jobName: 'ShopSphere Cypress',
    jobUrl: baseEnv.QUALITYOPS_JOB_URL,
    artifactUrl: baseEnv.QUALITYOPS_ARTIFACT_URL,
    environment: 'github-actions:success',
    startedAt: '2026-08-20T10:00:00.000Z',
    finishedAt: '2026-08-20T10:01:00.000Z',
    report: { results: [] }
  });
});

test('resolves the current job URL with the automatic GitHub token', async () => {
  let request;
  const jobUrl = await resolveCurrentJobUrl({ ...baseEnv, QUALITYOPS_JOB_URL: '' }, async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ jobs: [{ name: 'ShopSphere Cypress', html_url: baseEnv.QUALITYOPS_JOB_URL }] })
    };
  });
  assert.equal(jobUrl, baseEnv.QUALITYOPS_JOB_URL);
  assert.match(request.url, /actions\/runs\/42\/attempts\/1\/jobs/);
  assert.equal(request.options.headers.authorization, `Bearer ${baseEnv.GITHUB_TOKEN}`);
  assert.equal(request.options.headers['x-github-api-version'], '2022-11-28');
});

test('submits the report without placing the product token in the payload', async () => {
  let request;
  const result = await submitExternalCiReport({
    env: baseEnv,
    readFileImpl: async () => JSON.stringify({ results: [] }),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        status: 201,
        json: async () => ({ executionId: 'execution-1', duplicate: false, status: 'PASSED', summary: { executed: 5 } })
      };
    }
  });
  assert.equal(request.url, 'https://qualityops.example/api/products/shopsphere/test-reports');
  assert.equal(request.options.headers.authorization, `Bearer ${baseEnv.QUALITYOPS_TOKEN}`);
  assert.equal(request.options.body.includes(baseEnv.QUALITYOPS_TOKEN), false);
  assert.deepEqual(result, {
    httpStatus: 201,
    executionId: 'execution-1',
    duplicate: false,
    status: 'PASSED',
    summary: { executed: 5 }
  });
});

test('surfaces an idempotency conflict without echoing server content or credentials', async () => {
  await assert.rejects(
    submitExternalCiReport({
      env: baseEnv,
      readFileImpl: async () => JSON.stringify({ results: [] }),
      fetchImpl: async () => ({
        status: 409,
        json: async () => ({ existingExecutionId: 'execution-existing', error: 'untrusted server detail' })
      })
    }),
    (error) => {
      assert.match(error.message, /HTTP 409/);
      assert.match(error.message, /execution-existing/);
      assert.equal(error.message.includes(baseEnv.QUALITYOPS_TOKEN), false);
      assert.equal(error.message.includes('untrusted server detail'), false);
      return true;
    }
  );
});

test('rejects cross-product report formats before network submission', () => {
  assert.throws(
    () => buildExternalCiPayload({ ...baseEnv, QUALITYOPS_REPORT_FORMAT: 'playwright-json-v1' }, {}, baseEnv.QUALITYOPS_JOB_URL),
    /not accepted for shopsphere/
  );
});
