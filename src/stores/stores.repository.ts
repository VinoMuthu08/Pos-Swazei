import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '../generated/prisma/client';

@Injectable()
export class StoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    address?: string;
    merchantId: string;
  }) {
    return this.prisma.store.create({
      data: {
        name: data.name,
        address: data.address,
        merchantId: data.merchantId,
      },
    });
  }

  findAll(merchantId?: string) {
    return this.prisma.store.findMany({
      where: merchantId ? { merchantId } : {},
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.store.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  findActiveById(id: string, merchantId: string) {
    return this.prisma.store.findFirst({
      where: {
        id,
        merchantId,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      address?: string;
    },
  ) {
    return this.prisma.store.update({
      where: { id },
      data,
    });
  }
}