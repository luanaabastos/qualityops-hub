import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const allowedModes = new Set(['SUCCESS', 'FUNCTIONAL_FAILURE', 'INFRASTRUCTURE_FAILURE']);
const mode = process.argv[2];
const output = process.argv[3];
if (!allowedModes.has(mode) || !output) throw new Error('Invalid ServiceDesk runner arguments');
await fs.mkdir(output, { recursive: true });

if (mode === 'INFRASTRUCTURE_FAILURE') {
  await fs.writeFile(path.join(output, 'raw-report.json'), JSON.stringify({
    version: 'playwright-json-v1', framework: 'Playwright', tests: [],
    infrastructureError: { message: 'Playwright browser startup was intentionally interrupted for the deterministic demo.' }
  }, null, 2));
  process.exit(0);
}

const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [cli, 'test', '--config', 'demo-runners/servicedesk/playwright.config.ts'], {
    cwd: root,
    env: { ...process.env, DEMO_MODE: mode, DEMO_ARTIFACT_DIR: output },
    stdio: 'inherit',
    windowsHide: true
  });
  child.once('error', reject);
  child.once('exit', (exitCode) => resolve(exitCode ?? 1));
});
const reportExists = await fs.access(path.join(output, 'raw-report.json')).then(() => true).catch(() => false);
if (!reportExists || (mode === 'SUCCESS' && code !== 0)) process.exit(Number(code) || 1);
