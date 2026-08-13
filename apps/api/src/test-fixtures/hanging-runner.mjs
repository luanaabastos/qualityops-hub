/* global process, setInterval */
import fs from 'node:fs/promises';
import path from 'node:path';

await fs.writeFile(path.join(process.argv[3], 'child.pid'), String(process.pid));
setInterval(() => undefined, 60_000);
