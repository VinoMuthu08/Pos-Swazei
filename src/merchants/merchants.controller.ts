import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { UseGuards } from '@nestjs/common';
import { User } from '../users/user.entity';

@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
  ) { }

  @Post()
  @UseGuards(PlatformAdminGuard)
  async create(@Body() dto: CreateMerchantDto) {
    const result = await this.merchantsService.create(dto);
    return { message: 'Merchant successfully created', data: result };
  }

  @UseGuards(PlatformAdminGuard)
  @Get()
  @Permissions('merchant:read')
  async findAll(@CurrentUser() user: User) {
    const result = await this.merchantsService.findAll(user);
    return { message: 'Merchants successfully fetched', data: result };
  }

  @Get(':id')
  @Permissions('merchant:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.merchantsService.findOne(id, user);
    return { message: 'Merchant successfully fetched', data: result };
  }

  @Patch(':id')
  @Permissions('merchant:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.merchantsService.update(id, dto, user);
    return { message: 'Merchant successfully updated', data: result };
  }
}