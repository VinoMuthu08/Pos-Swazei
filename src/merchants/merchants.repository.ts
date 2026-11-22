import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '../generated/prisma/client';

@Injectable()
export class MerchantsRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(name: string) {
        return this.prisma.merchant.create({
            data: { name },
        });
    }

    findAll() {
        return this.prisma.merchant.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    findById(id: string) {
        return this.prisma.merchant.findUnique({
            where: { id },
            include: {
                stores: true,
            },
        });
    }

    findActiveById(id: string) {
        return this.prisma.merchant.findFirst({
            where: {
                id,
                status: RecordStatus.ACTIVE,
            },
        });
    }

    update(id: string, name: string) {
        return this.prisma.merchant.update({
            where: { id },
            data: { name },
        });
    }
}