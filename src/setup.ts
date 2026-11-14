import { INestApplication, ValidationPipe } from '@nestjs/common';
import { static as serveStatic } from 'express';
import { join } from 'node:path';
export function setup(app: INestApplication) {
  app.use(serveStatic(join(__dirname, '../public')));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  app.enableShutdownHooks();
}
