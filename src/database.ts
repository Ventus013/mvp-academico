import 'dotenv/config';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool, QueryConfig, QueryResultRow } from 'pg';

@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly pool: Pool;
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Configure DATABASE_URL para o PostgreSQL da aplicação.');
    this.pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000 });
  }
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = [], timeoutMs?: number) {
    const query: QueryConfig & { query_timeout?: number } = { text: sql, values, query_timeout: timeoutMs };
    return this.pool.query<T>(query);
  }
  async onApplicationShutdown() { await this.pool.end(); }
}
