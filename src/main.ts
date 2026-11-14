import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setup } from './setup';

async function main() {
  const app = await NestFactory.create(AppModule);
  setup(app);
  const port = Number(process.env.PORT ?? 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
}
void main().catch(() => { console.error('Não foi possível iniciar a API. Verifique a configuração local.'); process.exitCode = 1; });
