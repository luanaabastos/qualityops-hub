import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const stateFile = path.join(process.cwd(), '.demo-state.json');
const action = process.argv[2] ?? 'status';
const volataBin = process.platform === 'win32' ? 'C:\\Program Files\\Volta\\volta.exe' : 'volta';

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
    if (process.platform === 'win32') {
      const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      return result.status === 128;
    }
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

function startProcess(command, args, label) {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'ignore',
    detached: process.platform !== 'win32'
  });
}

if (action === 'start') {
  const existing = readState();
  if (existing.started && (existing.webPid || existing.apiPid)) {
    console.log('Demo already running');
    console.log('Frontend: http://localhost:5173');
    console.log('API: http://localhost:3001');
    console.log('Health: http://localhost:3001/api/health');
    process.exit(0);
  }

  const web = startProcess(volataBin, ['run', '--node', '20.20.1', 'pnpm', '--dir', 'apps/web', 'dev', '--host', '0.0.0.0'], 'web');
  const api = startProcess(volataBin, ['run', '--node', '20.20.1', 'pnpm', '--dir', 'apps/api', 'dev', '--host', '0.0.0.0'], 'api');

  writeState({
    started: true,
    webPid: web.pid,
    apiPid: api.pid,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    frontendUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3001',
    healthUrl: 'http://localhost:3001/api/health',
    minioUrl: 'http://localhost:9001'
  });

  console.log('Demo started');
  console.log('Frontend: http://localhost:5173');
  console.log('API: http://localhost:3001');
  console.log('Health: http://localhost:3001/api/health');
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
    minioUrl: 'http://localhost:9001'
  });
  console.log('Demo stopped');
  process.exit(0);
}

const state = readState();
console.log(JSON.stringify({
  running: !!state.started,
  webPid: state.webPid ?? null,
  apiPid: state.apiPid ?? null,
  frontendUrl: state.frontendUrl ?? 'http://localhost:5173',
  apiUrl: state.apiUrl ?? 'http://localhost:3001',
  healthUrl: state.healthUrl ?? 'http://localhost:3001/api/health',
  minioUrl: state.minioUrl ?? 'http://localhost:9001'
}, null, 2));
