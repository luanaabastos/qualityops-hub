#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bufferText, historyBlobs, isTextPath, workingEntries } from './scan-common.mjs';

const strongPatterns = [
  { label: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { label: 'bearer-token', pattern: /authorization\s*[:=]\s*["']?bearer\s+[a-z0-9._-]{16,}/i },
  { label: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { label: 'cloud-secret', pattern: /\b(?:sk|pk)_(?:live|prod)_[A-Za-z0-9]{20,}\b/i }
];
const assignmentPattern = /(?<![a-z0-9_-])(?:api[_-]?key|client[_-]?secret|secret[_-]?key|password|token)(?![a-z0-9_-])\s*[:=]\s*["']([^"']+)["']/gi;

function safeFixture(value) {
  const normalized = value.toLowerCase();
  return !value
    || value.startsWith('${')
    || value.startsWith('<')
    || ['demo', 'example', 'placeholder', 'change-me', 'qualityops', 'localhost', 'invalid'].some((marker) => normalized.includes(marker));
}

function inspectText(label, text, findings) {
  for (const rule of strongPatterns) {
    if (rule.pattern.test(text)) findings.push(`${label}: ${rule.label}`);
  }
  for (const match of text.matchAll(assignmentPattern)) {
    if (!safeFixture(match[1])) findings.push(`${label}: credential-assignment`);
  }
}

export function scanSecrets() {
  const working = [];
  const history = [];
  for (const entry of workingEntries()) {
    if (!isTextPath(entry.label)) continue;
    const text = bufferText(entry.content);
    if (text !== null) inspectText(`working-tree:${entry.label}`, text, working);
  }
  for (const entry of historyBlobs()) {
    if (!isTextPath(entry.label)) continue;
    const text = bufferText(entry.content);
    if (text !== null) inspectText(`git-history:${entry.objectId.slice(0, 12)}:${entry.label}`, text, history);
  }
  return { working: [...new Set(working)], history: [...new Set(history)] };
}

function run() {
  const result = scanSecrets();
  const findings = [...result.working, ...result.history];
  console.log(`SECRET_SCAN=${findings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
  if (findings.length > 0) {
    console.log(findings.join('\n'));
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url))) run();
