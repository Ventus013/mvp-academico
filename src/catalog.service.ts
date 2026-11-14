import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database } from './database';
import { AssociationInput, PageQuery, ProcessInput, ProductInput } from './dtos';

@Injectable()
export class CatalogService {
  constructor(private readonly db: Database) {}

  private async write(sql: string, values: unknown[]) {
    try { return await this.db.query(sql, values); }
    catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') throw new ConflictException('Código, associação ou posição já cadastrados.');
      if (code === '23503') throw new NotFoundException('Produto ou processo não encontrado.');
      throw error;
    }
  }
  async createProduct(input: ProductInput) {
    const result = await this.write(
      'INSERT INTO products (id, sku, name, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [randomUUID(), input.sku, input.name, input.description ?? ''],
    );
    return result.rows[0];
  }
  async createProcess(input: ProcessInput) {
    const result = await this.write(
      'INSERT INTO production_processes (id, code, name) VALUES ($1, $2, $3) RETURNING *',
      [randomUUID(), input.code, input.name],
    );
    return result.rows[0];
  }
  async listProducts(page: PageQuery) {
    return (await this.db.query('SELECT * FROM products ORDER BY sku LIMIT $1 OFFSET $2', [page.limit, page.offset])).rows;
  }
  async listProcesses(page: PageQuery) {
    return (await this.db.query('SELECT * FROM production_processes ORDER BY code LIMIT $1 OFFSET $2', [page.limit, page.offset])).rows;
  }
  async product(id: string) {
    const result = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!result.rows.length) throw new NotFoundException('Produto não encontrado.');
    return result.rows[0];
  }
  async process(id: string) {
    const result = await this.db.query('SELECT * FROM production_processes WHERE id = $1', [id]);
    if (!result.rows.length) throw new NotFoundException('Processo não encontrado.');
    return result.rows[0];
  }
  async associate(productId: string, processId: string, input: AssociationInput) {
    await this.product(productId);
    await this.process(processId);
    const result = await this.write(
      'INSERT INTO product_processes (product_id, process_id, position) VALUES ($1, $2, $3) RETURNING *',
      [productId, processId, input.position],
    );
    return result.rows[0];
  }
  async productProcesses(productId: string) {
    await this.product(productId);
    return (await this.db.query(
      'SELECT p.id, p.code, p.name, a.position FROM product_processes a JOIN production_processes p ON p.id = a.process_id WHERE a.product_id = $1 ORDER BY a.position',
      [productId],
    )).rows;
  }
  async unlink(productId: string, processId: string) {
    const result = await this.db.query('DELETE FROM product_processes WHERE product_id = $1 AND process_id = $2 RETURNING product_id', [productId, processId]);
    if (!result.rows.length) throw new NotFoundException('Associação não encontrada.');
  }
}
