#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const productFormats = Object.freeze({
  shopsphere: 'mochawesome',
  servicedesk: 'playwright-json-v1'
});

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function absoluteHttpsUrl(name, value) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new Error(`${name} must be an absolute HTTPS URL.`);
  return parsed.toString().replace(/\/$/, '');
}

function isoTimestamp(name, value) {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${name} must be an ISO timestamp.`);
  return new Date(value).toISOString();
}

export function buildExternalCiPayload(env, report, jobUrl) {
  const productKey = required(env, 'QUALITYOPS_PRODUCT');
  const reportFormat = required(env, 'QUALITYOPS_REPORT_FORMAT');
  if (!(productKey in productFormats)) throw new Error('QUALITYOPS_PRODUCT is not an external browser product.');
  if (productFormats[productKey] !== reportFormat) {
    throw new Error(`QUALITYOPS_REPORT_FORMAT is not accepted for ${productKey}.`);
  }
  const serverUrl = absoluteHttpsUrl('GITHUB_SERVER_URL', required(env, 'GITHUB_SERVER_URL'));
  const repository = required(env, 'GITHUB_REPOSITORY');
  const runId = required(env, 'GITHUB_RUN_ID');
  const mode = (env.QUALITYOPS_MODE ?? 'SUCCESS').toLowerCase();
  return {
    productKey,
    reportFormat,
    source: 'GITHUB_ACTIONS',
    suiteType: 'REGRESSION',
    branch: env.GITHUB_HEAD_REF?.trim() || required(env, 'GITHUB_REF_NAME'),
    commitSha: required(env, 'GITHUB_SHA'),
    pipelineId: runId,
    pipelineUrl: `${serverUrl}/${repository}/actions/runs/${runId}`,
    jobId: required(env, 'GITHUB_JOB'),
    jobName: required(env, 'QUALITYOPS_JOB_NAME'),
    jobUrl,
    artifactUrl: absoluteHttpsUrl('QUALITYOPS_ARTIFACT_URL', required(env, 'QUALITYOPS_ARTIFACT_URL')),
    environment: `github-actions:${mode}`,
    startedAt: isoTimestamp('QUALITYOPS_STARTED_AT', required(env, 'QUALITYOPS_STARTED_AT')),
    finishedAt: isoTimestamp('QUALITYOPS_FINISHED_AT', required(env, 'QUALITYOPS_FINISHED_AT')),
    report
  };
}

export async function resolveCurrentJobUrl(env, fetchImpl = fetch) {
  const apiUrl = absoluteHttpsUrl('GITHUB_API_URL', required(env, 'GITHUB_API_URL'));
  const repository = required(env, 'GITHUB_REPOSITORY');
  const runId = required(env, 'GITHUB_RUN_ID');
  const attempt = required(env, 'GITHUB_RUN_ATTEMPT');
  const jobName = required(env, 'QUALITYOPS_JOB_NAME');
  const token = required(env, 'GITHUB_TOKEN');
  const response = await fetchImpl(
    `${apiUrl}/repos/${repository}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28'
      }
    }
  );
  if (!response.ok) throw new Error(`GitHub jobs API returned HTTP ${response.status}.`);
  const body = await response.json();
  const job = body.jobs?.find((candidate) => candidate.name === jobName);
  if (!job?.html_url) throw new Error(`Unable to resolve the GitHub Actions job URL for ${jobName}.`);
  return absoluteHttpsUrl('GitHub job URL', job.html_url);
}

export async function submitExternalCiReport({ env, fetchImpl = fetch, readFileImpl = fs.readFile }) {
  const productKey = required(env, 'QUALITYOPS_PRODUCT');
  const token = required(env, 'QUALITYOPS_TOKEN');
  if (!token.startsWith(`qoh_${productKey}_`)) {
    throw new Error('QUALITYOPS_TOKEN does not match the selected product.');
  }
  const reportPath = path.resolve(required(env, 'QUALITYOPS_REPORT_PATH'));
  let report;
  try {
    report = JSON.parse(await readFileImpl(reportPath, 'utf8'));
  } catch {
    throw new Error('QUALITYOPS_REPORT_PATH must contain valid JSON.');
  }
  const jobUrl = env.QUALITYOPS_JOB_URL?.trim()
    ? absoluteHttpsUrl('QUALITYOPS_JOB_URL', env.QUALITYOPS_JOB_URL)
    : await resolveCurrentJobUrl(env, fetchImpl);
  const payload = buildExternalCiPayload(env, report, jobUrl);
  const baseUrl = absoluteHttpsUrl('QUALITYOPS_URL', required(env, 'QUALITYOPS_URL'));
  const response = await fetchImpl(`${baseUrl}/api/products/${productKey}/test-reports`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (![200, 201].includes(response.status)) {
    const identity = response.status === 409 && typeof body.existingExecutionId === 'string'
      ? ` Existing execution: ${body.existingExecutionId}.`
      : '';
    throw new Error(`TestOps Hub ingestion returned HTTP ${response.status}.${identity}`);
  }
  if (typeof body.executionId !== 'string') throw new Error('TestOps Hub ingestion did not return an execution ID.');
  return {
    httpStatus: response.status,
    executionId: body.executionId,
    duplicate: body.duplicate === true,
    status: body.status,
    summary: body.summary
  };
}

const isMainModule = process.argv[1]
  ? path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
  : false;

if (isMainModule) {
  try {
    const result = await submitExternalCiReport({ env: process.env });
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(
        process.env.GITHUB_OUTPUT,
        `http_status=${result.httpStatus}\nexecution_id=${result.executionId}\nduplicate=${result.duplicate}\n`
      );
    }
    console.log(JSON.stringify({ event: 'external_ci_ingestion_complete', ...result }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'External CI ingestion failed.');
    process.exitCode = 1;
  }
}
