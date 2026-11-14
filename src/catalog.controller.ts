import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { AssociationInput, PageQuery, ProcessInput, ProductInput } from './dtos';

@Controller('api')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Post('products') createProduct(@Body() input: ProductInput) { return this.catalog.createProduct(input); }
  @Get('products') products(@Query() query: PageQuery) { return this.catalog.listProducts(query); }
  @Get('products/:id') product(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.catalog.product(id); }
  @Post('processes') createProcess(@Body() input: ProcessInput) { return this.catalog.createProcess(input); }
  @Get('processes') processes(@Query() query: PageQuery) { return this.catalog.listProcesses(query); }
  @Get('processes/:id') process(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.catalog.process(id); }
  @Post('products/:productId/processes/:processId') associate(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Param('processId', new ParseUUIDPipe({ version: '4' })) processId: string,
    @Body() input: AssociationInput,
  ) { return this.catalog.associate(productId, processId, input); }
  @Get('products/:id/processes') productProcesses(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.catalog.productProcesses(id); }
  @Delete('products/:productId/processes/:processId') @HttpCode(204) unlink(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Param('processId', new ParseUUIDPipe({ version: '4' })) processId: string,
  ) { return this.catalog.unlink(productId, processId); }
}
