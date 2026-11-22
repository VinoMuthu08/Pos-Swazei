import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InventoryRepository } from './inventory.repository';
import { ProductsRepository } from '../products/products.repository';
import { StoresRepository } from '../stores/stores.repository';
import { User } from '../users/user.entity';
import { RestockInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly storesRepository: StoresRepository,
  ) { }

  private getStoreContext(user: User) {
    if (!user.merchantId || !user.storeId) {
      throw new ForbiddenException(
        'A valid store membership is required',
      );
    }

    return {
      merchantId: user.merchantId,
      storeId: user.storeId,
    };
  }

  async findAll(user: User) {
    const { merchantId, storeId } = this.getStoreContext(user);

    const store = await this.storesRepository.findActiveById(
      storeId,
      merchantId,
    );

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return await this.inventoryRepository.findAll(
      merchantId,
      storeId,
    );
  }

  async findByProduct(
    productId: string,
    user: User,
  ) {
    const { merchantId, storeId } = this.getStoreContext(user);

    const product = await this.productsRepository.findActiveById(
      productId,
      merchantId,
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const inventory = await this.inventoryRepository.findByProduct(
      storeId,
      productId,
    );

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    return inventory;
  }

  async restock(
    productId: string,
    dto: RestockInventoryDto,
    user: User,
  ) {
    const { merchantId, storeId } = this.getStoreContext(user);

    if (!Number.isSafeInteger(dto.quantity) || dto.quantity < 1) {
      throw new BadRequestException('Invalid restock quantity');
    }

    const store = await this.storesRepository.findActiveById(
      storeId,
      merchantId,
    );

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const product = await this.productsRepository.findActiveById(
      productId,
      merchantId,
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.inventoryRepository.restock(
      merchantId,
      storeId,
      productId,
      dto.quantity,
    );
  }
}