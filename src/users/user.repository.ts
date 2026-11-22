import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(data: {
        name: string;
        email: string;
        passwordHash: string;
        status: 'ACTIVE';
    }, membership: {
        merchantId: string;
        storeId: string | null;
        roleId: string;
    }) {
        return this.prisma.user.create({
            data: {
                ...data,
                memberships: { create: membership },
            },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            },
        });
    }


    findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: {
                        merchant: {
                        select: { id: true, name: true, status: true },
                        },
                        store: {
                        select: { id: true, name: true, status: true },
                        },
                        role: {
                            include: {
                                permissions: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    findActiveById(userId: string) {
        return this.prisma.user.findFirst({
            where: {
                id: userId,
                status: 'ACTIVE',
            },
        });
    }

    findActiveMembership(userId: string, membershipId: string) {
        return this.prisma.userMembership.findFirst({
            where: {
                id: membershipId,
                userId,
                status: 'ACTIVE',
            },
            include: {
                role: {
                    include: {
                        permissions: {
                            select: { name: true },
                        },
                    },
                },
            },
        });
    }

    findActiveRoleByName(name: string) {
        return this.prisma.role.findUnique({
            where: { name },
            select: { id: true, name: true },
        });
    }

    findActiveStore(storeId: string, merchantId: string) {
        return this.prisma.store.findFirst({
            where: {
                id: storeId,
                merchantId,
                status: 'ACTIVE',
            },
            select: { id: true },
        });
    }

    findActiveMerchant(merchantId: string) {
        return this.prisma.merchant.findFirst({
            where: {
                id: merchantId,
                status: 'ACTIVE',
            },
            select: { id: true },
        });
    }

    findAll(merchantId?: string, storeId?: string) {
        return this.prisma.user.findMany({
            where: merchantId
                ? {
                    memberships: {
                        some: {
                            merchantId,
                            status: 'ACTIVE',
                            ...(storeId ? { storeId } : {}),
                        },
                    },
                }
                : {},
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            },
        });
    }

    findOne(userId: string, merchantId?: string, storeId?: string) {
        return this.prisma.user.findFirst({
            where: {
                id: userId,
                ...(merchantId
                    ? {
                        memberships: {
                            some: {
                                merchantId,
                                status: 'ACTIVE',
                                ...(storeId ? { storeId } : {}),
                            },
                        },
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            },
        });
    }
}