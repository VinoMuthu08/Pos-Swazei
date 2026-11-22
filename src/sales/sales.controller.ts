import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Permissions('sale:create')
  async create(
    @Body() createSaleDto: CreateSaleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const result = await this.salesService.create(
      createSaleDto,
      user,
      idempotencyKey,
    );
    return { message: 'Sale successfully created', data: result };
  }

  @Get()
  @Permissions('sale:read')
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.salesService.findAll(user);
    return { message: 'Sales successfully fetched', data: result };
  }

  @Get(':id')
  @Permissions('sale:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.salesService.findOne(id, user);
    return { message: 'Sale successfully fetched', data: result };
  }
}