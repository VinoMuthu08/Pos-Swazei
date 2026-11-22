import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RedisCacheService } from '../common/cache/redis-cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly cache: RedisCacheService,
  ) {}

  async create(
    dto: CreateProductDto,
    user: AuthenticatedUser,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    const product = await this.productsRepository.create({
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      merchantId: user.merchantId,
    });
    await this.cache.delete(this.getCacheKey(user.merchantId));
    return product;
  }

  async findAll(user: AuthenticatedUser) {
    if (!user.merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    const cacheKey = this.getCacheKey(user.merchantId);
    const cachedProducts = await this.cache.get<unknown[]>(cacheKey);
    if (cachedProducts) {
      return cachedProducts;
    }

    const products = await this.productsRepository.findAll(user.merchantId);
    await this.cache.set(cacheKey, products, 60);
    return products;
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    const product = await this.productsRepository.findById(
      id,
      user.merchantId,
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: AuthenticatedUser,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No update fields provided');
    }

    const product = await this.productsRepository.findById(
      id,
      user.merchantId,
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.productsRepository.update(
      id,
      user.merchantId,
      dto,
    );

    if (result.count !== 1) {
      throw new NotFoundException('Product not found');
    }

    await this.cache.delete(this.getCacheKey(user.merchantId));
    return this.productsRepository.findById(id, user.merchantId);
  }

  private getCacheKey(merchantId: string) {
    return `products:${merchantId}`;
  }
}