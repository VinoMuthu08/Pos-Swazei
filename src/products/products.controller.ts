import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { User } from '../users/user.entity';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Post()
  @Permissions('product:create')
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.productsService.create(dto, user);
    return { message: 'Product successfully created', data: result };
  }

  @Get()
  @Permissions('product:read')
  async findAll(@CurrentUser() user: User) {
    const result = await this.productsService.findAll(user);
    return { message: 'Products successfully fetched', data: result };
  }

  @Get(':id')
  @Permissions('product:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.productsService.findOne(id, user);
    return { message: 'Product successfully fetched', data: result };
  }

  @Patch(':id')
  @Permissions('product:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.productsService.update(id, dto, user);
    return { message: 'Product successfully updated', data: result };
  }
}