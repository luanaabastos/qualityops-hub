import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml']);
const banned = [
  'github.com', 'gitlab.com', 'gitlab', 'linkedin.com', 'company.com', 'example.com',
  'azure.com', 'amazonaws.com', 'aws', 'gcp', 'servicenow.com', 'jira.com', 'confluence.com',
  'postman.com', 'testrun', 'realcompany', 'corp.example', 'realtoken', 'notrealuser@company.com'
];

const visited = new Set();
const issues = [];

function walk(dir) {
  if (visited.has(dir)) return;
  visited.add(dir);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.pnpm' || entry.name === 'dist' || entry.name === 'coverage' || entry.name === 'pnpm-lock.yaml') {
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
