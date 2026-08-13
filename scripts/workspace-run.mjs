#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const allowedCommands = new Set(['build', 'lint', 'test', 'typecheck']);
const command = process.argv[2];
const pnpmEntry = process.env.npm_execpath;

if (!command || !allowedCommands.has(command)) {
  console.error('Usage: node scripts/workspace-run.mjs <build|lint|test|typecheck>');
  process.exit(1);
}

if (!pnpmEntry) {
  console.error('This workspace command must be launched through pnpm.');
  process.exit(1);
}

const sharedBuild = spawnSync(process.execPath, [pnpmEntry, '--filter', '@qualityops-hub/shared', 'run', 'build'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});

if (sharedBuild.error || sharedBuild.status !== 0) {
  console.error('Unable to build shared contracts before workspace gate.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [pnpmEntry, '--recursive', 'run', command], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(`Unable to run workspace ${command} gate.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
