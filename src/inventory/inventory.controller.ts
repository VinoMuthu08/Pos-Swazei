import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';

import { InventoryService } from './inventory.service';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { User } from '../users/user.entity';
import { RestockInventoryDto } from './dto/create-inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  @Permissions('inventory:read')
  async findAll(@CurrentUser() user: User) {
    const result = await this.inventoryService.findAll(user);
    return { message: 'Inventory successfully fetched', data: result };
  }

  @Get(':productId')
  @Permissions('inventory:read')
  async findByProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.inventoryService.findByProduct(productId, user);
    return { message: 'Inventory successfully fetched', data: result };
  }

  @Patch(':productId/restock')
  @Permissions('inventory:restock')
  async restock(
    @Param('productId') productId: string,
    @Body() dto: RestockInventoryDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.inventoryService.restock(
      productId,
      dto,
      user,
    );
    return { message: 'Inventory successfully restocked', data: result };
  }
}