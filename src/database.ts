import 'dotenv/config';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly pool: Pool;
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Configure DATABASE_URL para um PostgreSQL local.');
    this.pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000 });
  }
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []) {
    return this.pool.query<T>(sql, values);
  }
  async onApplicationShutdown() { await this.pool.end(); }
}
