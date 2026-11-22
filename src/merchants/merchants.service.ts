import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MerchantsRepository } from './merchants.repository';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { User } from '../users/user.entity';

@Injectable()
export class MerchantsService {
  constructor(
    private readonly merchantsRepository: MerchantsRepository,
  ) {}

  async create(dto: CreateMerchantDto) {
    return await this.merchantsRepository.create(dto.name);
  }

  async findAll(user: User) {
    // Platform admins can view all merchants.
    if (user.isPlatformAdmin) {
      return await this.merchantsRepository.findAll();
    }

    // Regular users can only view their own merchant.
    if (!user.merchantId) {
      throw new ForbiddenException('Merchant access is required');
    }

    const merchant = await this.merchantsRepository.findById(
      user.merchantId,
    );

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return [merchant];
  }

  async findOne(id: string, user: User) {
    this.validateMerchantAccess(id, user);

    const merchant = await this.merchantsRepository.findById(id);

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async update(
    id: string,
    dto: UpdateMerchantDto,
    user: User,
  ) {
    if (!dto.name) {
      throw new BadRequestException('Merchant name is required');
    }

    this.validateMerchantAccess(id, user);

    const merchant = await this.merchantsRepository.findById(id);

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return await this.merchantsRepository.update(id, dto.name);
  }

  private validateMerchantAccess(
    merchantId: string,
    user: User,
  ) {
    if (
      !user.isPlatformAdmin &&
      user.merchantId !== merchantId
    ) {
      throw new ForbiddenException(
        'You cannot access another merchant',
      );
    }
  }
}