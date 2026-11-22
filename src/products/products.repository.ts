import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '../generated/prisma/client';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    sku: string;
    name: string;
    description?: string;
    price: number;
    merchantId: string;
  }) {
    return this.prisma.product.create({
      data
    });
  }

  findAll(merchantId: string) {
    return this.prisma.product.findMany({
      where: {
        merchantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string, merchantId: string) {
    return this.prisma.product.findFirst({
      where: {
        id,
        merchantId,
      },
    });
  }

  findActiveById(id: string, merchantId: string) {
    return this.prisma.product.findFirst({
      where: {
        id,
        merchantId,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  update(
    id: string,
    merchantId: string,
    data: {
      sku?: string;
      name?: string;
      description?: string;
      price?: number;
    },
  ) {
    return this.prisma.product.updateMany({
      where: {
        id,
        merchantId,
      },
      data,
    });
  }
}