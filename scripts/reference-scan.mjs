#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bufferText, git, historyBlobs, historyCommits, isTextPath, publicGitIdentity, workingEntries } from './scan-common.mjs';

const textRules = [
  { label: 'personal-windows-path', pattern: /[a-z]:\\users\\[^\\\s]+/i },
  { label: 'personal-posix-home', pattern: /\/(?:users|home)\/(?!runner(?:[/\s]|$))[^/\s]+/i },
  { label: 'private-ip-address', pattern: /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/ },
  { label: 'internal-hostname', pattern: /\b[a-z0-9.-]+\.(?:corp|internal|intranet|lan)\b/i },
  { label: 'private-gitlab-url', pattern: /https?:\/\/[^\s"']*gitlab[^\s"']*/i }
];
const emailPattern = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
const allowedEmailDomains = new Set(['example.com', 'example.test', 'users.noreply.github.com']);
const authorizedRemoteUrls = new Set([
  'https://github.com/luanaabastos/qualityops-hub',
  'git@github.com:luanaabastos/qualityops-hub',
  'ssh://git@github.com/luanaabastos/qualityops-hub'
]);

function normalizedRemoteUrl(value) {
  return value.trim().replace(/\/$/, '').replace(/\.git$/i, '');
}

function allowedEmailDomain(domain) {
  return allowedEmailDomains.has(domain)
    || domain.endsWith('.invalid')
    || domain.endsWith('.test')
    || domain.endsWith('.example')
    || domain === 'qualityops.local';
}

function inspectText(label, text, findings) {
  for (const rule of textRules) {
    if (rule.pattern.test(text)) findings.push(`${label}: ${rule.label}`);
  }
  if (!label.endsWith('pnpm-lock.yaml')) {
    for (const match of text.matchAll(emailPattern)) {
      if (!allowedEmailDomain(match[1].toLowerCase())) findings.push(`${label}: non-public-email`);
    }
  }
}

export function scanReferences() {
  const working = [];
  const history = [];
  const config = [];
  for (const entry of workingEntries()) {
    inspectText(`working-tree:${entry.label}`, entry.label, working);
    if (isTextPath(entry.label)) {
      const text = bufferText(entry.content);
      if (text !== null) inspectText(`working-tree:${entry.label}`, text, working);
    }
  }
  for (const entry of historyBlobs()) {
    inspectText(`git-history:${entry.objectId.slice(0, 12)}:${entry.label}`, entry.label, history);
    if (isTextPath(entry.label)) {
      const text = bufferText(entry.content);
      if (text !== null) inspectText(`git-history:${entry.objectId.slice(0, 12)}:${entry.label}`, text, history);
    }
  }
  for (const commit of historyCommits()) {
    const label = `git-history:${commit.sha.slice(0, 12)}`;
    if (commit.authorName !== publicGitIdentity.name) history.push(`${label}: non-public-author-name`);
    if (commit.authorEmail !== publicGitIdentity.email) history.push(`${label}: non-public-author-email`);
    if (commit.committerName !== publicGitIdentity.name) history.push(`${label}: non-public-committer-name`);
    if (commit.committerEmail !== publicGitIdentity.email) history.push(`${label}: non-public-committer-email`);
    inspectText(`${label}:message`, commit.message, history);
  }
  const localConfig = git(['config', '--local', '--list']);
  if (localConfig.status === 0) inspectText('git-local-config', localConfig.stdout, config);
  const remotes = git(['remote']);
  if (remotes.status === 0) {
    const names = remotes.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (names.some((name) => name !== 'origin')) config.push('git-local-config: unexpected-remote');
    if (names.includes('origin')) {
      const originUrls = git(['remote', 'get-url', '--all', 'origin']);
      const urls = originUrls.stdout.split(/\r?\n/).map(normalizedRemoteUrl).filter(Boolean);
      if (originUrls.status !== 0 || urls.length === 0 || urls.some((url) => !authorizedRemoteUrls.has(url))) {
        config.push('git-local-config: unauthorized-origin');
      }
    }
  }
  return {
    working: [...new Set(working)],
    history: [...new Set(history)],
    config: [...new Set(config)]
  };
}

function run() {
  const result = scanReferences();
  const findings = [...result.working, ...result.history, ...result.config];
  console.log(`CORPORATE_REFERENCE_SCAN=${findings.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
  if (findings.length > 0) {
    console.log(findings.join('\n'));
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url))) run();
