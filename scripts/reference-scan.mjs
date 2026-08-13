#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const textExtensions = new Set([
  '.css', '.env', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.cjs',
  '.ps1', '.sql', '.ts', '.tsx', '.txt', '.yaml', '.yml'
]);
const skippedDirectories = new Set([
  '.git', '.pnpm', '.pnpm-store', '.demo-logs', 'coverage', 'dist',
  'node_modules', 'playwright-report', 'test-results'
]);
const skippedFiles = new Set(['scripts/reference-scan.mjs']);
const rules = [
  { label: 'personal-windows-path', pattern: /[a-z]:\\users\\[^\\\s]+/i },
  { label: 'personal-posix-home', pattern: /\/(?:users|home)\/[^/\s]+/i },
  { label: 'external-corporate-host', pattern: /(?:gitlab|jira|confluence|servicenow|amazonaws)\.(?:com|net)/i },
  { label: 'placeholder-corporate-host', pattern: /(?:company\.com|corp\.example)/i },
  { label: 'external-project-marker', pattern: /(?:realcompany|realtoken|notrealuser@company\.com)/i }
];
const findings = [];

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function isTextFile(file) {
  const extension = path.extname(file).toLowerCase();
  return textExtensions.has(extension) || ['.gitignore', '.npmrc'].includes(path.basename(file));
}

function inspectText(label, text) {
  for (const rule of rules) {
    if (rule.pattern.test(text)) findings.push(`${label}: ${rule.label}`);
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(file);
      continue;
    }

    const label = relative(file);
    if (!isTextFile(file) || skippedFiles.has(label)) continue;
    const content = fs.readFileSync(file);
    if (content.includes(0)) continue;
    inspectText(label, content.toString('utf8'));
  }
}

function git(args) {
  return spawnSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
}

walk(root);

const history = git([
  'log', '--all', '--format=fuller', '-p', '--', '.',
  ':(exclude)scripts/reference-scan.mjs',
  ':(exclude)scripts/secret-scan.mjs'
]);
if (history.status === 0) inspectText('git-history', history.stdout);

const localConfig = git(['config', '--local', '--list']);
if (localConfig.status === 0) inspectText('git-local-config', localConfig.stdout);

const remotes = git(['remote', '-v']);
if (remotes.stdout.trim()) findings.push('git-local-config: remote-present');

const uniqueFindings = [...new Set(findings)];
console.log(`CORPORATE_REFERENCE_SCAN=${uniqueFindings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
if (uniqueFindings.length > 0) {
  console.log(uniqueFindings.join('\n'));
  process.exit(1);
}
