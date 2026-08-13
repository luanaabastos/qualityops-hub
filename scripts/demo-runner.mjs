import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const stateFile = path.join(root, '.demo-state.json');
const logDirectory = path.join(root, '.demo-logs');
const action = process.argv[2] ?? 'status';
const databaseUrl = 'postgresql://qualityops:qualityops@localhost:5432/qualityops_dev';

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch { return { started: false, webPid: null, apiPid: null }; }
}

function writeState(value) { fs.writeFileSync(stateFile, JSON.stringify(value, null, 2)); }
function isRunning(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function killPid(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(pid, 'SIGTERM');
  } catch { /* process already stopped */ }
}

function docker(args, stdio = 'inherit') {
  return spawnSync('docker', ['compose', ...args], { cwd: root, stdio, windowsHide: true, timeout: 120_000 });
}

function startProcess(args, cwd, label, env = {}) {
  fs.mkdirSync(logDirectory, { recursive: true });
  const log = fs.openSync(path.join(logDirectory, `${label}.log`), 'w');
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', log, log],
    detached: true,
    windowsHide: true
  });
  child.unref();
  fs.closeSync(log);
  return child;
}

function removeProjectRuntimeArtifacts() {
  const demoArtifacts = path.resolve(root, 'artifacts', 'demo-runs');
  const expectedArtifacts = `${path.resolve(root)}${path.sep}artifacts${path.sep}demo-runs`;
  if (demoArtifacts !== expectedArtifacts) throw new Error('Unsafe demo artifact path');
  fs.rmSync(demoArtifacts, { recursive: true, force: true });
  fs.rmSync(logDirectory, { recursive: true, force: true });
}

async function waitFor(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch { /* startup in progress */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function startDemo() {
  const existing = readState();
  if (existing.started && isRunning(existing.webPid) && isRunning(existing.apiPid)) {
    console.log('Demo already running');
    console.log('Frontend: http://localhost:5173');
    console.log('API: http://localhost:3001');
    return;
  }
  killPid(existing.webPid);
  killPid(existing.apiPid);
  const database = docker(['up', '-d', '--wait', 'postgres']);
  if (database.status !== 0) {
    console.error('Unable to start the local PostgreSQL service. Start Docker Desktop and retry.');
    process.exit(database.status ?? 1);
  }

  const web = startProcess([path.join(root, 'apps', 'web', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0'], path.join(root, 'apps', 'web'), 'web');
  const api = startProcess(['--import', 'tsx', 'src/server.ts'], path.join(root, 'apps', 'api'), 'api', {
    DATABASE_URL: databaseUrl,
    DEMO_PIPELINE_LAB_ENABLED: 'true'
  });
  const ready = await waitFor('http://127.0.0.1:3001/api/readiness');
  const webReady = await waitFor('http://127.0.0.1:5173');
  if (!ready || !webReady) {
    killPid(web.pid);
    killPid(api.pid);
    console.error('Demo services did not become ready. Inspect .demo-logs for details.');
    throw new Error('Demo startup failed');
  }
  writeState({ started: true, webPid: web.pid, apiPid: api.pid, startedAt: new Date().toISOString(), stoppedAt: null,
    frontendUrl: 'http://localhost:5173', apiUrl: 'http://localhost:3001', healthUrl: 'http://localhost:3001/api/health', readinessUrl: 'http://localhost:3001/api/readiness' });
  console.log('Demo started');
  console.log('Frontend: http://localhost:5173');
  console.log('API: http://localhost:3001');
  console.log('PostgreSQL: ready');
}

if (action === 'start') {
  await startDemo();
  process.exit(0);
}

if (action === 'stop') {
  const state = readState();
  killPid(state.webPid);
  killPid(state.apiPid);
  docker(['stop', 'postgres'], 'ignore');
  writeState({ ...state, started: false, webPid: null, apiPid: null, stoppedAt: new Date().toISOString() });
  console.log('Demo stopped');
  process.exit(0);
}

if (action === 'reset') {
  const confirmation = '--confirm-local-demo-reset';
  if (!process.argv.includes(confirmation)) {
    console.error(`Refusing destructive reset without ${confirmation}.`);
    process.exit(2);
  }
  const state = readState();
  killPid(state.webPid);
  killPid(state.apiPid);
  writeState({ ...state, started: false, webPid: null, apiPid: null, stoppedAt: new Date().toISOString() });
  const database = docker(['up', '-d', '--wait', 'postgres']);
  if (database.status !== 0) process.exit(database.status ?? 1);
  removeProjectRuntimeArtifacts();
  const reset = spawnSync(process.execPath, [
    path.join(root, 'apps', 'api', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    path.join(root, 'apps', 'api', 'src', 'reset-demo.ts'),
    confirmation
  ], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    windowsHide: true,
    timeout: 60_000
  });
  if (reset.status !== 0) process.exit(reset.status ?? 1);
  await startDemo();
  console.log('Demo reset to predictable seeded local state and restarted.');
  process.exit(0);
}

const state = readState();
const webRunning = isRunning(state.webPid);
const apiRunning = isRunning(state.apiPid);
const databaseResult = docker(['ps', '--status', 'running', '--services'], 'pipe');
const databaseRunning = databaseResult.status === 0 && String(databaseResult.stdout).split(/\r?\n/).includes('postgres');
console.log(JSON.stringify({
  running: webRunning && apiRunning && databaseRunning,
  webRunning,
  apiRunning,
  databaseRunning,
  webPid: state.webPid ?? null,
  apiPid: state.apiPid ?? null,
  frontendUrl: state.frontendUrl ?? 'http://localhost:5173',
  apiUrl: state.apiUrl ?? 'http://localhost:3001',
  healthUrl: state.healthUrl ?? 'http://localhost:3001/api/health',
  readinessUrl: state.readinessUrl ?? 'http://localhost:3001/api/readiness'
}, null, 2));
