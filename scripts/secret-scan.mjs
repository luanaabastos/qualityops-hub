import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.env', '.mjs', '.cjs']);

// Patterns that look like secrets
const secretPatterns = [
  /password\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
  /api[_-]?key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
  /secret\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
  /token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
  /aws[_-]?access[_-]?key[_-]?id\s*[:=]\s*['"]?[A-Z0-9]{20}['"]?/gi,
  /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9\/\+]+['"]?/gi,
  /private[_-]?key\s*[:=]\s*['"]?-----BEGIN/gi,
  /authorization\s*[:=]\s*['"]?Bearer\s+[A-Za-z0-9._\-]+['"]?/gi,
];

const visited = new Set();
const issues = [];
const skipFiles = new Set(['docker-compose.yml', 'docker-compose.yaml']);

function walk(dir) {
  if (visited.has(dir)) return;
  visited.add(dir);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.pnpm' || 
        entry.name === 'dist' || entry.name === 'coverage' || entry.name === 'pnpm-lock.yaml' ||
        entry.name === 'artifacts' || entry.name.startsWith('.') || skipFiles.has(entry.name)) {
      continue;
    }
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    
    try {
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of secretPatterns) {
        if (pattern.test(text)) {
          issues.push(`${full}: potential secret found (pattern: ${pattern.source})`);
          pattern.lastIndex = 0;
        }
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }
}

walk(root);
console.log(`SECRET_SCAN=${issues.length === 0 ? 'ZERO_FINDINGS' : 'FINDINGS'}`);
if (issues.length > 0) {
  console.log(issues.join('\n'));
  process.exit(1);
}
