import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    findAll(merchantId: string, storeId: string) {
        return this.prisma.storeInventory.findMany({
            where: {
                merchantId,
                storeId,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        sku: true,
                        name: true,
                        price: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    findByProduct(
        storeId: string,
        productId: string,
    ) {
        return this.prisma.storeInventory.findUnique({
            where: {
                storeId_productId: {
                    storeId,
                    productId,
                },
            },
            include: {
                product: true,
            },
        });
    }

    async restock(
        merchantId: string,
        storeId: string,
        productId: string,
        quantity: number,
    ) {
        return this.prisma.storeInventory.upsert({
            where: {
                storeId_productId: {
                    storeId,
                    productId,
                },
            },
            create: {
                merchantId,
                storeId,
                productId,
                quantity,
            },
            update: {
                quantity: {
                    increment: quantity,
                },
            },
        });
    }
}