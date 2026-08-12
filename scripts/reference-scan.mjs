import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml']);
const banned = [
  'github.com', 'gitlab', 'linkedin.com', 'company', 'example.com', 'corp', 'enterprise',
  'prod.example.com', 'internal', 'azure', 'aws', 'gcp', 'servicenow', 'jira', 'confluence',
  'postman', 'testrun', 'qualityops.local', 'owner@qualityops.local'
];

const visited = new Set();
const issues = [];

function walk(dir) {
  if (visited.has(dir)) return;
  visited.add(dir);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.pnpm' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const token of banned) {
      if (text.toLowerCase().includes(token.toLowerCase())) {
        issues.push(`${full}: contains ${token}`);
      }
    }
  }
}

walk(root);
console.log(`CORPORATE_REFERENCE_SCAN=${issues.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
if (issues.length > 0) {
  console.log(issues.join('\n'));
  process.exit(1);
}
