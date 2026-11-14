import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const client = await pool.connect().catch(async error => { await pool.end(); throw error; });
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(573104)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY)');
    const applied = await client.query('SELECT version FROM schema_migrations WHERE version = 1');
    if (!applied.rows.length) {
      await client.query(readFileSync(resolve(__dirname, '../migrations/001_catalog.sql'), 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES (1)');
    }
    await client.query('COMMIT');
    console.log('Migrações aplicadas; esquema na versão 1.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
}
void migrate().catch(() => { console.error('Falha na migração. Confira conexão e permissões do banco da aplicação.'); process.exitCode = 1; });
