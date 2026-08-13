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
const onlyArgument = process.argv.find((argument) => argument.startsWith('--only='))?.split('=')[1];
const defaultArtifactDirectory = path.join(root, 'artifacts', 'frontend-review', timestamp);
const artifactDirectory = directoryArgument ? path.resolve(root, directoryArgument) : defaultArtifactDirectory;
const evidenceRoot = path.join(root, 'artifacts', 'frontend-review');

if (!artifactDirectory.startsWith(`${evidenceRoot}${path.sep}`)) {
  throw new Error('Evidence output must stay inside artifacts/frontend-review');
}
const commit = spawnSync(
  'git',
  ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'rev-parse', '--short', 'HEAD'],
  { cwd: root, encoding: 'utf8' }
).stdout.trim();

const evidence = [
  { filename: '01-overview-desktop.png', route: '/', viewport: { width: 1440, height: 900 } },
  { filename: '02-products-desktop.png', route: '/products', viewport: { width: 1440, height: 900 } },
  { filename: '03-shopsphere.png', route: '/products/shopsphere', viewport: { width: 1280, height: 900 } },
  { filename: '04-servicedesk.png', route: '/products/servicedesk', viewport: { width: 1280, height: 900 } },
  { filename: '05-pocketwallet.png', route: '/products/pocketwallet', viewport: { width: 1440, height: 900 } },
  { filename: '06-executions.png', route: '/executions', viewport: { width: 1440, height: 900 } },
  { filename: '07-how-it-works.png', route: '/how-it-works', viewport: { width: 1280, height: 900 } },
  { filename: '08-overview-tablet.png', route: '/', viewport: { width: 768, height: 1024 } },
  { filename: '09-overview-mobile.png', route: '/', viewport: { width: 390, height: 844 } },
  {
    filename: '10-mobile-drawer.png',
    route: '/',
    viewport: { width: 390, height: 844 },
    fullPage: false,
    prepare: async (page) => page.getByRole('button', { name: 'Open navigation' }).click()
  },
  {
    filename: '11-empty-state.png',
    route: '/executions',
    viewport: { width: 1280, height: 720 },
    prepare: async (page) => {
      await page.getByLabel('Product').selectOption('pocketwallet');
      await page.getByLabel('Status').selectOption('FAILED');
      await page.getByText('No executions match the selected filters.').waitFor();
    }
  },
  { filename: '12-stale-state.png', route: '/products/servicedesk', viewport: { width: 1280, height: 900 } },
  { filename: '13-infrastructure-error.png', route: '/products/pocketwallet', viewport: { width: 1440, height: 1100 } }
];

await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch();
const manifestPath = path.join(artifactDirectory, 'manifest.json');
let manifestEntries = [];

try {
  manifestEntries = JSON.parse(await readFile(manifestPath, 'utf8')).screenshots ?? [];
} catch {
  manifestEntries = [];
}

const selectedEvidence = onlyArgument
  ? evidence.filter((item) => onlyArgument.split(',').includes(item.filename))
  : evidence;

if (selectedEvidence.length === 0) throw new Error('No evidence matched --only');

try {
  for (const item of selectedEvidence) {
    const context = await browser.newContext({ viewport: item.viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${baseURL}${item.route}`, { waitUntil: 'networkidle' });
    await page.locator('main').waitFor();
    if (item.prepare) await item.prepare(page);

    const output = path.join(artifactDirectory, item.filename);
    await page.screenshot({ path: output, fullPage: item.fullPage ?? true, animations: 'disabled' });
    const hash = createHash('sha256').update(await readFile(output)).digest('hex');

    const entry = {
      filename: item.filename,
      route: item.route,
      viewport: item.viewport,
      timestamp: new Date().toISOString(),
      commit,
      syntheticData: true,
      sha256: hash
    };
    manifestEntries = [...manifestEntries.filter((existing) => existing.filename !== item.filename), entry];
    await context.close();
  }
} finally {
  await browser.close();
}

const manifest = {
  generatedAt: new Date().toISOString(),
  commit,
  syntheticData: true,
  screenshots: manifestEntries
};

manifestEntries.sort((left, right) => left.filename.localeCompare(right.filename));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`EVIDENCE_ARTIFACT_DIRECTORY=${path.relative(root, artifactDirectory).replaceAll('\\', '/')}`);
console.log(`EVIDENCE_SCREENSHOTS=${manifestEntries.length}`);
console.log(`EVIDENCE_REGENERATED=${selectedEvidence.length}`);
console.log('EVIDENCE_MANIFEST=PASS');
