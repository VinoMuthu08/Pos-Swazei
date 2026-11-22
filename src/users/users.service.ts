import {
  BadRequestException,
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(dto: CreateUserDto, authUser: AuthenticatedUser) {
    let merchantId: string;
    let storeId: string | null;

    if (authUser.isPlatformAdmin) {
      if (dto.role !== 'MERCHANT_OWNER' || !dto.merchantId) {
        throw new ForbiddenException(
          'Platform admins can create merchant owners for a selected merchant',
        );
      }

      const merchant = await this.usersRepository.findActiveMerchant(
        dto.merchantId,
      );
      if (!merchant) {
        throw new NotFoundException('Active merchant not found');
      }

      merchantId = merchant.id;
      storeId = null;
    } else {
      if (!authUser.merchantId || !authUser.membershipId) {
        throw new ForbiddenException('A valid merchant membership is required');
      }

      const membership = await this.usersRepository.findActiveMembership(
        authUser.sub,
        authUser.membershipId,
      );
      if (
        !membership ||
        membership.merchantId !== authUser.merchantId ||
        membership.storeId !== (authUser.storeId ?? null)
      ) {
        throw new ForbiddenException('A valid merchant membership is required');
      }

      const allowedRoles: Record<string, string[]> = {
        MERCHANT_OWNER: ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CASHIER'],
        STORE_MANAGER: ['INVENTORY_MANAGER', 'CASHIER'],
      };
      if (!allowedRoles[membership.role.name]?.includes(dto.role)) {
        throw new ForbiddenException('You cannot create a user with this role');
      }

      merchantId = membership.merchantId;
      storeId = membership.storeId ?? dto.storeId ?? null;
      if (!storeId) {
        throw new BadRequestException('storeId is required to create a user');
      }
      if (membership.storeId && dto.storeId && dto.storeId !== membership.storeId) {
        throw new ForbiddenException('You cannot create users for another store');
      }

      const store = await this.usersRepository.findActiveStore(
        storeId,
        merchantId,
      );
      if (!store) {
        throw new NotFoundException('Active store not found');
      }
    }

    const role = await this.usersRepository.findActiveRoleByName(dto.role);
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      status: 'ACTIVE',
    }, {
      merchantId,
      storeId,
      roleId: role.id,
    });
  }

  async findAll(authUser: AuthenticatedUser) {
    const merchantId = authUser.isPlatformAdmin
      ? undefined
      : authUser.merchantId ?? undefined;
    if (!authUser.isPlatformAdmin && !merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    return this.usersRepository.findAll(merchantId, authUser.storeId ?? undefined);
  }

  async findOne(userId: string, authUser: AuthenticatedUser) {
    const merchantId = authUser.isPlatformAdmin
      ? undefined
      : authUser.merchantId ?? undefined;
    if (!authUser.isPlatformAdmin && !merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    const user = await this.usersRepository.findOne(
      userId,
      merchantId,
      authUser.storeId ?? undefined,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}