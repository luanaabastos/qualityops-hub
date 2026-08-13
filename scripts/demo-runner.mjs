import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const stateFile = path.join(process.cwd(), '.demo-state.json');
const logDirectory = path.join(process.cwd(), '.demo-logs');
const action = process.argv[2] ?? 'status';
const root = process.cwd();

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { started: false, webPid: null, apiPid: null, startedAt: null, stoppedAt: null };
  }
}

function writeState(next) {
  fs.writeFileSync(stateFile, JSON.stringify(next, null, 2));
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPid(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    }
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore cleanup failures
  }
}

function startProcess(args, cwd, label) {
  fs.mkdirSync(logDirectory, { recursive: true });
  const log = fs.openSync(path.join(logDirectory, `${label}.log`), 'a');
  const child = spawn(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', log, log],
    detached: true,
    windowsHide: true
  });
  child.unref();
  fs.closeSync(log);
  return child;
}

if (action === 'start') {
  const existing = readState();
  if (existing.started && isRunning(existing.webPid) && isRunning(existing.apiPid)) {
    console.log('Demo already running');
    console.log('Frontend: http://localhost:5173');
    console.log('API: http://localhost:3001');
    console.log('Health: http://localhost:3001/api/health');
    console.log('Readiness: http://localhost:3001/api/readiness');
    process.exit(0);
  }

  killPid(existing.webPid);
  killPid(existing.apiPid);

  const web = startProcess(
    [path.join(root, 'apps', 'web', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0'],
    path.join(root, 'apps', 'web'),
    'web'
  );
  const api = startProcess(
    ['--import', 'tsx', 'src/server.ts'],
    path.join(root, 'apps', 'api'),
    'api'
  );

  writeState({
    started: true,
    webPid: web.pid,
    apiPid: api.pid,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    frontendUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3001',
    healthUrl: 'http://localhost:3001/api/health',
    readinessUrl: 'http://localhost:3001/api/readiness',
    minioUrl: 'http://localhost:9001'
  });

  console.log('Demo started');
  console.log('Frontend: http://localhost:5173');
  console.log('API: http://localhost:3001');
  console.log('Health: http://localhost:3001/api/health');
  console.log('Readiness: http://localhost:3001/api/readiness');
  console.log('MinIO: http://localhost:9001');
  process.exit(0);
}

if (action === 'stop') {
  const state = readState();
  if (!state.started) {
    console.log('Demo not running');
    process.exit(0);
  }

  killPid(state.webPid);
  killPid(state.apiPid);
  writeState({
    started: false,
    webPid: null,
    apiPid: null,
    startedAt: state.startedAt ?? null,
    stoppedAt: new Date().toISOString(),
    frontendUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3001',
    healthUrl: 'http://localhost:3001/api/health',
    readinessUrl: 'http://localhost:3001/api/readiness',
    minioUrl: 'http://localhost:9001'
  });
  console.log('Demo stopped');
  process.exit(0);
}

const state = readState();
const webRunning = isRunning(state.webPid);
const apiRunning = isRunning(state.apiPid);
console.log(JSON.stringify({
  running: webRunning && apiRunning,
  webRunning,
  apiRunning,
  webPid: state.webPid ?? null,
  apiPid: state.apiPid ?? null,
  frontendUrl: state.frontendUrl ?? 'http://localhost:5173',
  apiUrl: state.apiUrl ?? 'http://localhost:3001',
  healthUrl: state.healthUrl ?? 'http://localhost:3001/api/health',
  readinessUrl: state.readinessUrl ?? 'http://localhost:3001/api/readiness',
  minioUrl: state.minioUrl ?? 'http://localhost:9001'
}, null, 2));
