import { Body, Controller, Delete, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { UUIDParam } from './uuid-param';
import { CatalogService } from './catalog.service';
import { AssociationInput, PageQuery, ProcessInput, ProductInput } from './dtos';

@Controller('api')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Post('products') createProduct(@Body() input: ProductInput) { return this.catalog.createProduct(input); }
  @Get('products') products(@Query() query: PageQuery) { return this.catalog.listProducts(query); }
  @Get('products/:id') product(@UUIDParam('id') id: string) { return this.catalog.product(id); }
  @Post('processes') createProcess(@Body() input: ProcessInput) { return this.catalog.createProcess(input); }
  @Get('processes') processes(@Query() query: PageQuery) { return this.catalog.listProcesses(query); }
  @Get('processes/:id') process(@UUIDParam('id') id: string) { return this.catalog.process(id); }
  @Put('products/:id') updateProduct(@UUIDParam('id') id: string, @Body() input: ProductInput) { return this.catalog.updateProduct(id, input); }
  @Put('processes/:id') updateProcess(@UUIDParam('id') id: string, @Body() input: ProcessInput) { return this.catalog.updateProcess(id, input); }
  @Delete('products/:id') @HttpCode(204) deleteProduct(@UUIDParam('id') id: string) { return this.catalog.deleteProduct(id); }
  @Delete('processes/:id') @HttpCode(204) deleteProcess(@UUIDParam('id') id: string) { return this.catalog.deleteProcess(id); }
  @Post('products/:productId/processes/:processId') associate(
    @UUIDParam('productId') productId: string,
    @UUIDParam('processId') processId: string,
    @Body() input: AssociationInput,
  ) { return this.catalog.associate(productId, processId, input); }
  @Get('products/:id/processes') productProcesses(@UUIDParam('id') id: string) { return this.catalog.productProcesses(id); }
  @Delete('products/:productId/processes/:processId') @HttpCode(204) unlink(
    @UUIDParam('productId') productId: string,
    @UUIDParam('processId') processId: string,
  ) { return this.catalog.unlink(productId, processId); }
}
