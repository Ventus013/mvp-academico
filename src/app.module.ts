import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Database } from './database';

@Module({ controllers: [CatalogController], providers: [Database, CatalogService] })
export class AppModule {}
