import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

function run(file, mode = 'wait') {
  const child = spawn(process.execPath, [path.join(root, file)], {
    cwd: root,
    env: process.env,
    shell: false,
    stdio: 'inherit',
    windowsHide: true
  });
  if (mode === 'server') {
    const forward = (signal) => {
      if (!child.killed) child.kill(signal);
    };
    process.once('SIGINT', () => forward('SIGINT'));
    process.once('SIGTERM', () => forward('SIGTERM'));
  }
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0
      ? resolve()
      : reject(new Error(`${file} exited with ${code ?? signal ?? 'unknown status'}`)));
  });
}

await run('apps/api/dist/migrate.js');
await run('apps/api/dist/bootstrap.js');
await run('apps/api/dist/server.js', 'server');
