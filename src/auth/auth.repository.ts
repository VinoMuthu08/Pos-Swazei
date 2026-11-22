import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) { }

    findUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    where: {
                        status: 'ACTIVE',
                    },
                    include: {
                        merchant: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        store: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        role: {
                            include: {
                                permissions: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
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
                merchant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                role: {
                    include: {
                        permissions: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    }

    findUserById(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                isPlatformAdmin: true,
            },
        });
    }
}