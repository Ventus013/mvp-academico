import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { Database } from './database';

@Controller('health')
export class HealthController {
  constructor(private readonly db: Database) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async check() {
    try {
      await this.db.query('SELECT 1', [], 2000);
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
  }
}
