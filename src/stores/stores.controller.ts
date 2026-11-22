import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { User } from '../users/user.entity';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
  ) {}

  @Post()
  @Permissions('store:create')
  async create(
    @Body() dto: CreateStoreDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.storesService.create(dto, user);
    return { message: 'Store successfully created', data: result };
  }

  @Get()
  @Permissions('store:read')
  async findAll(@CurrentUser() user: User) {
    const result = await this.storesService.findAll(user);
    return { message: 'Stores successfully fetched', data: result };
  }

  @Get(':id')
  @Permissions('store:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.storesService.findOne(id, user);
    return { message: 'Store successfully fetched', data: result };
  }

  @Patch(':id')
  @Permissions('store:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.storesService.update(id, dto, user);
    return { message: 'Store successfully updated', data: result };
  }
}