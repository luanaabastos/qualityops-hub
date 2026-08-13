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
  '.git', '.pnpm', '.pnpm-store', '.cache', '.demo-logs', 'coverage', 'dist',
  'node_modules', 'playwright-report', 'test-results'
]);
const skippedFiles = new Set(['scripts/secret-scan.mjs']);
const findings = [];
const strongPatterns = [
  { label: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { label: 'bearer-token', pattern: /authorization\s*[:=]\s*["']?bearer\s+[a-z0-9._-]{16,}/i },
  { label: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { label: 'generic-long-token', pattern: /\b(?:sk|pk)_(?:live|prod)_[A-Za-z0-9]{20,}\b/i }
];
const assignmentPattern = /(?<![a-z0-9_-])(?:api[_-]?key|client[_-]?secret|secret[_-]?key|password|token)(?![a-z0-9_-])\s*[:=]\s*["']([^"']+)["']/i;

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function isTextFile(file) {
  const extension = path.extname(file).toLowerCase();
  return textExtensions.has(extension) || ['.gitignore', '.npmrc'].includes(path.basename(file));
}

function isSafeFixture(value) {
  const normalized = value.toLowerCase();
  return !value
    || value.startsWith('${')
    || value.startsWith('<')
    || ['demo', 'example', 'placeholder', 'change-me', 'qualityops', 'localhost'].some((marker) => normalized.includes(marker));
}

function inspectText(label, text) {
  for (const rule of strongPatterns) {
    if (rule.pattern.test(text)) findings.push(`${label}: ${rule.label}`);
  }

  for (const line of text.split(/\r?\n/)) {
    const match = assignmentPattern.exec(line);
    if (match && !isSafeFixture(match[1])) findings.push(`${label}: credential-assignment`);
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

const uniqueFindings = [...new Set(findings)];
console.log(`SECRET_SCAN=${uniqueFindings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
if (uniqueFindings.length > 0) {
  console.log(uniqueFindings.join('\n'));
  process.exit(1);
}
