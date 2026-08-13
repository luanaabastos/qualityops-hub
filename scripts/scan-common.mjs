import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const publicGitIdentity = {
  name: 'Luana do Amaral Bastos',
  email: '114043780+luanaabastos@users.noreply.github.com'
};
const textExtensions = new Set([
  '.css', '.env', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.cjs',
  '.ps1', '.sql', '.ts', '.tsx', '.txt', '.yaml', '.yml'
]);
const skippedDirectories = new Set([
  '.git', '.pnpm', '.pnpm-store', '.cache', '.demo-logs', 'artifacts', 'coverage',
  'dist', 'node_modules', 'playwright-report', 'test-results'
]);
const scannerFiles = new Set([
  'scripts/reference-scan.mjs',
  'scripts/secret-scan.mjs',
  'scripts/public-release-scan.mjs',
  'scripts/scan-common.mjs'
]);

export function normalizeLabel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

export function isScannerFile(label) {
  return scannerFiles.has(label.replaceAll('\\', '/'));
}

export function isTextPath(label) {
  const extension = path.extname(label).toLowerCase();
  return textExtensions.has(extension) || ['.gitignore', '.npmrc', '.nvmrc'].includes(path.basename(label));
}

export function bufferText(buffer) {
  if (buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

export function workingEntries() {
  if (workingEntries.cache) return workingEntries.cache;
  const entries = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      const label = normalizeLabel(file);
      if (isScannerFile(label)) continue;
      entries.push({ label, content: fs.readFileSync(file), source: 'working-tree' });
    }
  }
  walk(root);
  workingEntries.cache = entries;
  return entries;
}
workingEntries.cache = null;

export function git(args, maxBuffer = 64 * 1024 * 1024) {
  return spawnSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], {
    cwd: root,
    encoding: args.includes('--binary') ? 'buffer' : 'utf8',
    maxBuffer
  });
}

export function historyBlobs() {
  if (historyBlobs.cache) return historyBlobs.cache;
  const objects = git(['rev-list', '--objects', '--all']);
  if (objects.status !== 0) throw new Error('Unable to enumerate Git history');
  const entries = [];
  const seen = new Set();
  for (const line of objects.stdout.split(/\r?\n/)) {
    const separator = line.indexOf(' ');
    if (separator < 0) continue;
    const objectId = line.slice(0, separator);
    const label = line.slice(separator + 1);
    if (!label || seen.has(objectId) || isScannerFile(label)) continue;
    seen.add(objectId);
    const type = git(['cat-file', '-t', objectId]);
    if (type.status !== 0 || type.stdout.trim() !== 'blob') continue;
    const size = git(['cat-file', '-s', objectId]);
    if (size.status !== 0 || Number(size.stdout.trim()) > 5 * 1024 * 1024) continue;
    const blob = spawnSync('git', [
      '-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'cat-file', 'blob', objectId
    ], { cwd: root, encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
    if (blob.status === 0) entries.push({ label, objectId, content: blob.stdout, source: 'git-history' });
  }
  historyBlobs.cache = entries;
  return entries;
}
historyBlobs.cache = null;

export function historyCommits() {
  if (historyCommits.cache) return historyCommits.cache;
  const result = git(['log', '--all', '--format=%H%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e']);
  if (result.status !== 0) throw new Error('Unable to enumerate Git commits');
  historyCommits.cache = result.stdout.split('\x1e').map((record) => record.trim()).filter(Boolean).map((record) => {
    const [sha, authorName, authorEmail, committerName, committerEmail, ...message] = record.split('\x1f');
    return { sha, authorName, authorEmail, committerName, committerEmail, message: message.join('\x1f') };
  });
  return historyCommits.cache;
}
historyCommits.cache = null;
