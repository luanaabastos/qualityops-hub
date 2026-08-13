#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root, bufferText, workingEntries } from './scan-common.mjs';
import { scanReferences } from './reference-scan.mjs';
import { scanSecrets } from './secret-scan.mjs';

const personalPathPatterns = [
  /[a-z]:\\users\\[^\\\s]+/i,
  /\/(?:users|home)\/[^/\s]+/i
];
const assetDirectory = path.join(root, 'docs', 'assets');

function scanPublicPaths() {
  const findings = [];
  for (const entry of workingEntries()) {
    const text = bufferText(entry.content);
    if (personalPathPatterns.some((pattern) => pattern.test(entry.label) || (text !== null && pattern.test(text)))) {
      findings.push(`${entry.label}: personal-absolute-path`);
    }
  }
  return [...new Set(findings)];
}

function scanAssets() {
  const findings = [];
  const assets = [];
  if (!fs.existsSync(assetDirectory)) return { findings: ['docs/assets: missing'], assets };
  for (const entry of fs.readdirSync(assetDirectory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(assetDirectory, entry.name);
    const content = fs.readFileSync(file);
    if (path.extname(entry.name).toLowerCase() !== '.png') {
      findings.push(`docs/assets/${entry.name}: unsupported-public-asset`);
      continue;
    }
    const isPng = content.length > 24 && content.subarray(1, 4).toString('ascii') === 'PNG';
    if (!isPng) findings.push(`docs/assets/${entry.name}: invalid-png`);
    const binaryText = content.toString('latin1');
    if (personalPathPatterns.some((pattern) => pattern.test(binaryText))) {
      findings.push(`docs/assets/${entry.name}: embedded-personal-path`);
    }
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(binaryText)) {
      findings.push(`docs/assets/${entry.name}: embedded-email`);
    }
    assets.push({
      file: `docs/assets/${entry.name}`,
      bytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex')
    });
  }
  if (assets.length < 4 || assets.length > 6) findings.push('docs/assets: expected-four-to-six-png-files');
  return { findings: [...new Set(findings)], assets };
}

const references = scanReferences();
const secrets = scanSecrets();
const historyFindings = [...references.history, ...secrets.history];
const pathFindings = scanPublicPaths();
const assetResult = scanAssets();

console.log(`GIT_HISTORY_SCAN=${historyFindings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
console.log(`PUBLIC_PATH_SCAN=${pathFindings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
console.log(`PUBLIC_ASSET_SCAN=${assetResult.findings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
console.log(`PUBLIC_ASSETS=${assetResult.assets.length}`);

const findings = [...historyFindings, ...pathFindings, ...assetResult.findings];
if (findings.length > 0) {
  console.log(findings.join('\n'));
  process.exitCode = 1;
}
