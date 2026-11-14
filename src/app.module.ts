import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Database } from './database';
import { HealthController } from './health.controller';

@Module({ controllers: [CatalogController, HealthController], providers: [Database, CatalogService] })
export class AppModule {}
