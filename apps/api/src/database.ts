import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const repositoryRoot = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const defaultDatabaseUrl = 'postgresql://qualityops:qualityops@localhost:5432/qualityops_dev';

export class Database {
  readonly pool: pg.Pool;

  constructor(connectionString = process.env.DATABASE_URL ?? defaultDatabaseUrl) {
    this.pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 5_000 });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const directory = path.join(repositoryRoot, 'prisma', 'migrations');
    const filenames = (await fs.readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
    for (const filename of filenames) {
      const applied = await this.pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
      if (applied.rowCount) continue;
      const sql = await fs.readFile(path.join(directory, filename), 'utf8');
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export { repositoryRoot };
