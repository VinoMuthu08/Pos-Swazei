import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { StoresRepository } from './stores.repository';
import { MerchantsRepository } from '../merchants/merchants.repository';

import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { User } from '../users/user.entity';

@Injectable()
export class StoresService {
  constructor(
    private readonly storesRepository: StoresRepository,
    private readonly merchantsRepository: MerchantsRepository,
  ) {}

  async create(
    dto: CreateStoreDto,
    user: User,
  ) {
    let merchantId: string;

    if (user.isPlatformAdmin) {
      if (!dto.merchantId) {
        throw new BadRequestException(
          'merchantId is required for platform admin',
        );
      }

      merchantId = dto.merchantId;
    } else {
      if (!user.merchantId) {
        throw new ForbiddenException('Merchant access is required');
      }
      if (user.storeId) {
        throw new ForbiddenException(
          'Only merchant-level users can create stores',
        );
      }

      merchantId = user.merchantId;
    }

    const merchant =
      await this.merchantsRepository.findActiveById(merchantId);

    if (!merchant) {
      throw new NotFoundException('Active merchant not found');
    }

    return this.storesRepository.create({
      name: dto.name,
      address: dto.address,
      merchantId,
    });
  }

  async findAll(user: User) {
    if (user.isPlatformAdmin) {
      return this.storesRepository.findAll();
    }

    if (!user.merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    // A store-level user sees only their assigned store.
    if (user.storeId) {
      const store = await this.storesRepository.findById(user.storeId);

      if (!store || store.merchantId !== user.merchantId) {
        throw new NotFoundException('Store not found');
      }

      return [store];
    }

    return this.storesRepository.findAll(user.merchantId);
  }

  async findOne(
    id: string,
    user: User,
  ) {
    const store = await this.storesRepository.findById(id);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    this.validateStoreAccess(store.merchantId, store.id, user);

    return store;
  }

  async update(
    id: string,
    dto: UpdateStoreDto,
    user: User,
  ) {
    if (!dto.name && dto.address === undefined) {
      throw new BadRequestException('No update fields provided');
    }

    const store = await this.storesRepository.findById(id);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    this.validateStoreAccess(store.merchantId, store.id, user);

    return this.storesRepository.update(id, {
      name: dto.name,
      address: dto.address,
    });
  }

  private validateStoreAccess(
    merchantId: string,
    storeId: string,
    user: User,
  ) {
    if (user.isPlatformAdmin) {
      return;
    }

    if (user.merchantId !== merchantId) {
      throw new ForbiddenException(
        'You cannot access another merchant store',
      );
    }

    if (user.storeId && user.storeId !== storeId) {
      throw new ForbiddenException(
        'You cannot access another store',
      );
    }
  }
}