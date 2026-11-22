
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class SalesRepository {
    constructor(private readonly prisma: PrismaService) { }

    findIdempotencyKey(
        merchantId: string,
        storeId: string,
        key: string,
    ) {
        return this.prisma.idempotencyKey.findUnique({
            where: {
                merchantId_storeId_key: {
                    merchantId,
                    storeId,
                    key,
                },
            },
            include: {
                sale: {
                    include: {
                        items: {
                            include: {
                                product: true,
                            },
                        },
                        payment: true,
                    },
                },
            },
        });
    }

    findAll(merchantId: string, storeId: string) {
        return this.prisma.sale.findMany({
            where: { merchantId, storeId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, merchantId: string, storeId: string) {
        const sale = await this.prisma.sale.findFirst({
            where: { id, merchantId, storeId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                payment: true,
            },
        });

        if (!sale) {
            throw new NotFoundException('Sale not found');
        }

        return sale;
    }
}
