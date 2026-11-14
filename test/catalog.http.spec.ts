import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Database } from '../src/database';
import { setup } from '../src/setup';

describe('Catálogo HTTP + persistência SQL', () => {
  let app: INestApplication;
  let pool: Pool;
  let admin: Pool | undefined;
  const schema = `suite_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (url) {
      if (!new URL(url).pathname.endsWith('_test')) throw new Error('Banco de teste precisa terminar em _test.');
      admin = new Pool({ connectionString: url });
      await admin.query(`CREATE SCHEMA "${schema}"`);
      pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
    } else {
      const memory = newDb();
      const adapter = memory.adapters.createPg();
      pool = new adapter.Pool() as Pool;
    }
    await pool.query(readFileSync(resolve(__dirname, '../migrations/001_catalog.sql'), 'utf8'));
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Database).useValue({ query: (sql: string, params: unknown[]) => pool.query(sql, params) }).compile();
    app = module.createNestApplication();
    setup(app);
    await app.init();
  });
  beforeEach(async () => {
    await pool.query('DELETE FROM product_processes');
    await pool.query('DELETE FROM production_processes');
    await pool.query('DELETE FROM products');
  });
  afterAll(async () => {
    if (app) await app.close();
    if (pool) await pool.end();
    if (admin) { await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end(); }
  });
  const product = () => request(app.getHttpServer()).post('/api/products').send({ sku: ' demo-a ', name: ' Bloco fictício ' });
  const createProcess = (code = 'PREP') => request(app.getHttpServer()).post('/api/processes').send({ code, name: 'Etapa fictícia' });

  it('informa a saúde da aplicação e do banco sem permitir cache', async () => {
    await request(app.getHttpServer()).get('/health')
      .expect(200, { status: 'ok', database: 'up' })
      .expect('Cache-Control', 'no-store')
      .expect('X-Content-Type-Options', 'nosniff');
  });
  it('retorna 503 sem expor detalhes quando o banco está indisponível', async () => {
    const query = jest.spyOn(app.get(Database), 'query')
      .mockRejectedValueOnce(new Error('sensitive connection details'));
    try {
      const response = await request(app.getHttpServer()).get('/health')
        .expect(503, { status: 'error', database: 'down' })
        .expect('Cache-Control', 'no-store');
      expect(response.text).not.toContain('sensitive');
      expect(query).toHaveBeenCalledWith('SELECT 1', [], 2000);
    } finally {
      query.mockRestore();
    }
  });

  it('cadastra, normaliza, persiste e consulta um produto', async () => {
    const created = await product().expect(201);
    expect(created.body).toMatchObject({ sku: 'DEMO-A', name: 'Bloco fictício', description: '' });
    await request(app.getHttpServer()).get(`/api/products/${created.body.id}`).expect(200, created.body);
    expect((await request(app.getHttpServer()).get('/api/products').expect(200)).body).toHaveLength(1);
  });
  it('cadastra e consulta processos independentemente de produtos', async () => {
    const created = await createProcess(' prep ').expect(201);
    expect(created.body.code).toBe('PREP');
    await request(app.getHttpServer()).get(`/api/processes/${created.body.id}`).expect(200, created.body);
    expect((await request(app.getHttpServer()).get('/api/processes').expect(200)).body).toHaveLength(1);
  });
  it('recusa códigos repetidos, inclusive diferenças de caixa', async () => {
    await product().expect(201); await product().expect(409);
    await createProcess('prep').expect(201); await createProcess('PREP').expect(409);
  });
  it.each([
    { sku: '', name: 'Objeto' }, { sku: 'A', name: '   ' },
    { sku: 'A B', name: 'Objeto' }, { sku: 'A', name: 'Objeto', internal: 'campo extra' },
    { sku: 123, name: 'Objeto' }, { sku: 'A', name: 'Objeto', description: 'x'.repeat(1001) },
  ])('recusa produto inválido: %j', async body => {
    await request(app.getHttpServer()).post('/api/products').send(body).expect(400);
  });
  it('recusa processo vazio e propriedades desconhecidas', async () => {
    await request(app.getHttpServer()).post('/api/processes').send({ code: 'A', name: '' }).expect(400);
    await request(app.getHttpServer()).post('/api/processes').send({ code: 'A', name: 'Etapa', unexpected: true }).expect(400);
  });
  it('associa várias etapas e retorna em ordem, sem impor sequência de negócio', async () => {
    const p = (await product()).body;
    const a = (await createProcess('A')).body; const b = (await createProcess('B')).body;
    await request(app.getHttpServer()).post(`/api/products/${p.id}/processes/${a.id}`).send({ position: 2 }).expect(201);
    await request(app.getHttpServer()).post(`/api/products/${p.id}/processes/${b.id}`).send({ position: 1 }).expect(201);
    const result = await request(app.getHttpServer()).get(`/api/products/${p.id}/processes`).expect(200);
    expect(result.body.map((r: { code: string }) => r.code)).toEqual(['B', 'A']);
  });
  it('permite compartilhar um processo entre dois produtos', async () => {
    const a = (await product()).body;
    const b = (await request(app.getHttpServer()).post('/api/products').send({ sku: 'DEMO-B', name: 'Outro objeto' })).body;
    const step = (await createProcess()).body;
    for (const p of [a, b]) await request(app.getHttpServer()).post(`/api/products/${p.id}/processes/${step.id}`).send({ position: 1 }).expect(201);
  });
  it('recusa associação repetida e posição ocupada', async () => {
    const p = (await product()).body;
    const a = (await createProcess('A')).body; const b = (await createProcess('B')).body;
    const url = `/api/products/${p.id}/processes/`;
    await request(app.getHttpServer()).post(url + a.id).send({ position: 1 }).expect(201);
    await request(app.getHttpServer()).post(url + a.id).send({ position: 2 }).expect(409);
    await request(app.getHttpServer()).post(url + b.id).send({ position: 1 }).expect(409);
  });
  it('recusa referências ausentes e UUID inválido', async () => {
    const p = (await product()).body; const step = (await createProcess()).body;
    await request(app.getHttpServer()).post(`/api/products/${p.id}/processes/${randomUUID()}`).send({ position: 1 }).expect(404);
    await request(app.getHttpServer()).post(`/api/products/${randomUUID()}/processes/${step.id}`).send({ position: 1 }).expect(404);
    await request(app.getHttpServer()).get('/api/products/invalido').expect(400);
    await request(app.getHttpServer()).get(`/api/processes/${randomUUID()}`).expect(404);
    await request(app.getHttpServer()).get(`/api/products/${randomUUID()}/processes`).expect(404);
  });
  it.each(['invalido', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'])(
    'recusa identificador %s em todos os parâmetros de rota UUID v4', async invalidId => {
      const validId = randomUUID();
      for (const collection of ['products', 'processes']) {
        const url = `/api/${collection}/${invalidId}`;
        await request(app.getHttpServer()).get(url).expect(400);
        await request(app.getHttpServer()).put(url).send(
          collection === 'products' ? { sku: 'A', name: 'Objeto' } : { code: 'A', name: 'Etapa' },
        ).expect(400);
        await request(app.getHttpServer()).delete(url).expect(400);
      }
      await request(app.getHttpServer()).get(`/api/products/${invalidId}/processes`).expect(400);
      for (const [productId, processId] of [[invalidId, validId], [validId, invalidId]]) {
        const url = `/api/products/${productId}/processes/${processId}`;
        await request(app.getHttpServer()).post(url).send({ position: 1 }).expect(400);
        await request(app.getHttpServer()).delete(url).expect(400);
      }
    },
  );
  it.each([0, -1, 1.5, '1', 10001])('recusa posição inválida %j', async position => {
    await request(app.getHttpServer()).post(`/api/products/${randomUUID()}/processes/${randomUUID()}`).send({ position }).expect(400);
  });
  it('remove somente o vínculo e permite reutilizar a posição', async () => {
    const p = (await product()).body; const step = (await createProcess()).body;
    const url = `/api/products/${p.id}/processes/${step.id}`;
    await request(app.getHttpServer()).post(url).send({ position: 1 }).expect(201);
    await request(app.getHttpServer()).delete(url).expect(204);
    await request(app.getHttpServer()).delete(url).expect(404);
    await request(app.getHttpServer()).get(`/api/processes/${step.id}`).expect(200);
    await request(app.getHttpServer()).post(url).send({ position: 1 }).expect(201);
  });
  it('pagina listas e recusa parâmetros fora dos limites', async () => {
    await product();
    await request(app.getHttpServer()).get('/api/products?limit=1&offset=1').expect(200, []);
    await request(app.getHttpServer()).get('/api/products?limit=101').expect(400);
    await request(app.getHttpServer()).get('/api/processes?offset=-1').expect(400);
  });
  it('preserva texto como dado e não como instrução SQL', async () => {
    const name = "Objeto'); DROP TABLE products; --";
    const created = await request(app.getHttpServer()).post('/api/products').send({ sku: 'SQL-DEMO', name }).expect(201);
    expect(created.body.name).toBe(name);
    await product().expect(201);
  });
  it('serve a interface na raiz e os arquivos estáticos', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('Content-Type', /html/);
    await request(app.getHttpServer()).get('/app.js').expect(200);
    await request(app.getHttpServer()).get('/styles.css').expect(200);
  });
  it.each([
    ['/', 200, /html/],
    ['/app.js', 200, /javascript/],
    ['/styles.css', 200, /css/],
    ['/api/products', 200, /json/],
    ['/api/products/invalido', 400, /json/],
    [`/api/products/${randomUUID()}`, 404, /json/],
  ] as const)('protege os cabeçalhos HTTP de %s', async (url, status, contentType) => {
    const response = await request(app.getHttpServer()).get(url)
      .expect(status)
      .expect('Content-Type', contentType)
      .expect('X-Content-Type-Options', 'nosniff');
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
  it('edita produto e processo e mantém os vínculos', async () => {
    const p = (await product()).body; const step = (await createProcess()).body;
    await request(app.getHttpServer()).post(`/api/products/${p.id}/processes/${step.id}`).send({ position: 1 }).expect(201);
    const updated = await request(app.getHttpServer()).put(`/api/products/${p.id}`).send({ sku: 'NOVO', name: 'Produto revisado', description: 'Revisão fictícia' }).expect(200);
    expect(updated.body.sku).toBe('NOVO');
    await request(app.getHttpServer()).put(`/api/processes/${step.id}`).send({ code: 'REV', name: 'Etapa revisada' }).expect(200);
    const links = await request(app.getHttpServer()).get(`/api/products/${p.id}/processes`).expect(200);
    expect(links.body[0].name).toBe('Etapa revisada');
  });
  it('exclui produto com seus vínculos e preserva o processo', async () => {
    const p = (await product()).body; const step = (await createProcess()).body;
    await request(app.getHttpServer()).post(`/api/products/${p.id}/processes/${step.id}`).send({ position: 1 }).expect(201);
    await request(app.getHttpServer()).delete(`/api/processes/${step.id}`).expect(409);
    await request(app.getHttpServer()).delete(`/api/products/${p.id}`).expect(204);
    await request(app.getHttpServer()).get(`/api/products/${p.id}`).expect(404);
    await request(app.getHttpServer()).get(`/api/processes/${step.id}`).expect(200);
    await request(app.getHttpServer()).delete(`/api/processes/${step.id}`).expect(204);
    await request(app.getHttpServer()).get(`/api/processes/${step.id}`).expect(404);
  });
  it('valida atualizações e exclusões inexistentes', async () => {
    const id = randomUUID();
    await request(app.getHttpServer()).put(`/api/products/${id}`).send({ sku: 'X', name: 'Novo' }).expect(404);
    await request(app.getHttpServer()).put(`/api/processes/${id}`).send({ code: 'X', name: 'Novo' }).expect(404);
    await request(app.getHttpServer()).delete(`/api/products/${id}`).expect(404);
    await request(app.getHttpServer()).delete(`/api/processes/${id}`).expect(404);
    await request(app.getHttpServer()).put(`/api/products/${id}`).send({ sku: 'X', name: '' }).expect(400);
  });
});
