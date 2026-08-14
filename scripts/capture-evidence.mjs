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
const evidenceRoot = path.join(root, 'artifacts', 'checkpoint-7');
const artifactDirectory = directoryArgument ? path.resolve(root, directoryArgument) : path.join(evidenceRoot, timestamp);
if (!artifactDirectory.startsWith(`${evidenceRoot}${path.sep}`)) throw new Error('Evidence output must stay inside artifacts/checkpoint-7');

const commit = spawnSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
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

try {
  const desktopRoutes = [
    ['01-overview', '/'],
    ['02-pipeline-lab', '/pipeline-lab'],
    ['03-products', '/products'],
    ['05-executions', '/executions'],
    ['07-coverage', '/coverage'],
    ['08-integrations', '/integrations'],
    ['09-automation-plan', '/automation-plan'],
    ['10-video-evidence', '/video-evidence'],
    ['11-documentation', '/documentation'],
    ['12-how-it-works', '/how-it-works'],
    ['13-platform-health', '/platform-health']
  ];
  for (const [filename, route] of desktopRoutes) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading').first().waitFor();
    await capture(filename, route);
  }

  await page.goto(`${baseURL}/products`, { waitUntil: 'networkidle' });
  const productHref = await page.getByRole('link', { name: 'ShopSphere' }).getAttribute('href');
  if (!productHref) throw new Error('Product details link is unavailable');
  await page.goto(`${baseURL}${productHref}`, { waitUntil: 'networkidle' });
  await capture('04-product-details', productHref, null, 'shopsphere');

  await page.goto(`${baseURL}/executions`, { waitUntil: 'networkidle' });
  const executionHref = await page.getByRole('link', { name: 'View execution' }).first().getAttribute('href');
  if (!executionHref) throw new Error('Execution details link is unavailable');
  await page.goto(`${baseURL}${executionHref}`, { waitUntil: 'networkidle' });
  await capture('06-execution-details', executionHref);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await capture('14-overview-mobile', '/');
  await page.goto(`${baseURL}/pipeline-lab`, { waitUntil: 'networkidle' });
  await capture('15-pipeline-lab-mobile', '/pipeline-lab');
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
