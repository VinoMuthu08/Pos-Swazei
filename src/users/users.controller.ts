import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Permissions('user:create')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.usersService.create(dto, user);
    return { message: 'User successfully created', data: result };
  }

  @Get()
  @Permissions('user:read')
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.usersService.findAll(user);
    return { message: 'Users successfully fetched', data: result };
  }

  @Get('me')
  @Permissions('user:read')
  async myProfile(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.usersService.findOne(user.sub, user);
    return { message: 'User profile successfully fetched', data: result };
  }

  @Get(':id')
  @Permissions('user:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.usersService.findOne(id, user);
    return { message: 'User successfully fetched', data: result };
  }
}