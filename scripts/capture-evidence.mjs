#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.QUALITYOPS_WEB_URL ?? 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const directoryArgument = process.argv.find((argument) => argument.startsWith('--artifact-directory='))?.split('=')[1];
const evidenceRoot = path.join(root, 'artifacts', 'checkpoint-4');
const artifactDirectory = directoryArgument ? path.resolve(root, directoryArgument) : path.join(evidenceRoot, timestamp);
if (!artifactDirectory.startsWith(`${evidenceRoot}${path.sep}`)) throw new Error('Evidence output must stay inside artifacts/checkpoint-4');

const commit = spawnSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const entries = [];

async function capture(filename, route, runId = null, product = null, mode = null) {
  const output = path.join(artifactDirectory, `${filename}.png`);
  await page.screenshot({ path: output, fullPage: true, animations: 'disabled' });
  entries.push({
    filename: `${filename}.png`, route, runId, product, mode,
    timestamp: new Date().toISOString(), commit, syntheticData: true,
    sha256: createHash('sha256').update(await readFile(output)).digest('hex')
  });
}

async function runPipeline(product, mode, captureRunning = false) {
  await page.goto(`${baseURL}/pipeline-lab`, { waitUntil: 'networkidle' });
  await page.getByLabel('Product').selectOption(product);
  await page.getByLabel('Suite').selectOption('REGRESSION');
  await page.getByLabel('Execution mode').selectOption(mode);
  await page.getByRole('button', { name: 'Run demo pipeline' }).click();
  const runId = await page.locator('code').first().textContent();
  if (!runId) throw new Error('Pipeline Lab did not return a runId');
  if (captureRunning) {
    await page.getByText('Running known local demo runner').waitFor({ timeout: 30_000 });
    await capture('02-run-running', '/pipeline-lab', runId, product, mode);
  }
  await page.getByRole('heading', { name: 'Pipeline result' }).waitFor({ timeout: 120_000 });
  const executionHref = await page.getByRole('link', { name: 'View execution' }).getAttribute('href');
  return { runId, executionHref };
}

try {
  await page.goto(`${baseURL}/pipeline-lab`, { waitUntil: 'networkidle' });
  await capture('01-pipeline-lab', '/pipeline-lab');

  const shopSuccess = await runPipeline('shopsphere', 'SUCCESS', true);
  await capture('03-shopsphere-success', '/pipeline-lab', shopSuccess.runId, 'shopsphere', 'SUCCESS');

  const shopFailure = await runPipeline('shopsphere', 'FUNCTIONAL_FAILURE');
  await capture('04-shopsphere-functional-failure', '/pipeline-lab', shopFailure.runId, 'shopsphere', 'FUNCTIONAL_FAILURE');

  const serviceSuccess = await runPipeline('servicedesk', 'SUCCESS');
  await capture('05-servicedesk-success', '/pipeline-lab', serviceSuccess.runId, 'servicedesk', 'SUCCESS');

  const pocketError = await runPipeline('pocketwallet', 'INFRASTRUCTURE_FAILURE');
  await capture('06-pocketwallet-infrastructure-error', '/pipeline-lab', pocketError.runId, 'pocketwallet', 'INFRASTRUCTURE_FAILURE');

  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await capture('07-overview-after-run', '/');
  await page.goto(`${baseURL}/executions`, { waitUntil: 'networkidle' });
  await capture('08-execution-history', '/executions');
  if (!shopFailure.executionHref) throw new Error('ShopSphere failure execution link is unavailable');
  await page.goto(`${baseURL}${shopFailure.executionHref}`, { waitUntil: 'networkidle' });
  await capture('09-execution-details', shopFailure.executionHref, shopFailure.runId, 'shopsphere', 'FUNCTIONAL_FAILURE');
  await page.goto(`${baseURL}/products/shopsphere`, { waitUntil: 'networkidle' });
  await capture('10-regression-delta', '/products/shopsphere', shopFailure.runId, 'shopsphere', 'FUNCTIONAL_FAILURE');
} finally {
  await context.close();
  await browser.close();
}

await writeFile(path.join(artifactDirectory, 'manifest.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(), commit, syntheticData: true, screenshots: entries
}, null, 2)}\n`);
console.log(`EVIDENCE_ARTIFACT_DIRECTORY=${path.relative(root, artifactDirectory).replaceAll('\\', '/')}`);
console.log(`EVIDENCE_SCREENSHOTS=${entries.length}`);
console.log('EVIDENCE_MANIFEST=PASS');
