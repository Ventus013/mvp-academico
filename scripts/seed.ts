import 'dotenv/config';
import { Pool } from 'pg';

async function seed() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const client = await pool.connect().catch(async error => { await pool.end(); throw error; });
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO products (id, sku, name, description) VALUES ('10000000-0000-4000-8000-000000000001', 'DEMO-BOX', 'Caixa didática', 'Objeto fictício para apresentação') ON CONFLICT DO NOTHING");
    await client.query("INSERT INTO production_processes (id, code, name) VALUES ('20000000-0000-4000-8000-000000000001', 'DEMO-PREP', 'Preparação de exemplo'), ('20000000-0000-4000-8000-000000000002', 'DEMO-CHECK', 'Conferência de exemplo') ON CONFLICT DO NOTHING");
    await client.query("INSERT INTO product_processes (product_id, process_id, position) SELECT p.id, r.id, v.position FROM (VALUES ('DEMO-PREP', 1), ('DEMO-CHECK', 2)) AS v(code, position) JOIN production_processes r ON r.code = v.code JOIN products p ON p.sku = 'DEMO-BOX' ON CONFLICT DO NOTHING");
    await client.query('COMMIT');
    console.log('Dados fictícios inseridos.');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
void seed().catch(() => { console.error('Falha no seed. Execute a migração e confira o banco local.'); process.exitCode = 1; });
