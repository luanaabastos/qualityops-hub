import fs from 'node:fs/promises';
import path from 'node:path';

const allowedModes = new Set(['SUCCESS', 'FUNCTIONAL_FAILURE', 'INFRASTRUCTURE_FAILURE']);
const mode = process.argv[2];
const output = process.argv[3];
if (!allowedModes.has(mode) || !output) throw new Error('Invalid PocketWallet harness arguments');
await fs.mkdir(output, { recursive: true });

const titles = ['login', 'balance', 'transfer', 'receipt', 'logout'];
const infrastructure = mode === 'INFRASTRUCTURE_FAILURE';
const tests = infrastructure ? [] : titles.map((title, index) => {
  const failed = mode === 'FUNCTIONAL_FAILURE' && title === 'transfer';
  return {
    file: 'demo-runners/pocketwallet/harness.mjs',
    suite: 'PocketWallet mobile harness',
    title,
    status: failed ? 'FAILED' : 'PASSED',
    durationMs: 90 + index * 20,
    error: failed ? { message: 'Fictional transfer state did not match', expected: 'completed', actual: 'pending' } : null
  };
});
const passed = tests.filter((test) => test.status === 'PASSED').length;
const failed = tests.filter((test) => test.status === 'FAILED').length;
await fs.writeFile(path.join(output, 'raw-report.json'), JSON.stringify({
  version: 'mobile-e2e-json-v1',
  executionMode: 'MOBILE_HARNESS_DEMO',
  total: 5,
  executed: infrastructure ? 0 : tests.length,
  passed,
  failed,
  skipped: 0,
  infrastructureError: infrastructure ? { message: 'MOBILE_HARNESS_DEMO startup was intentionally interrupted; no Android device was used.' } : null,
  tests
}, null, 2));
console.log(`MOBILE_HARNESS_DEMO ${mode}: generated ${tests.length} test result(s).`);
