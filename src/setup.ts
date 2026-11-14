import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NextFunction, Request, Response, static as serveStatic } from 'express';
import { join } from 'node:path';
export function setup(app: INestApplication) {
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(serveStatic(join(__dirname, '../public')));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  app.enableShutdownHooks();
}
