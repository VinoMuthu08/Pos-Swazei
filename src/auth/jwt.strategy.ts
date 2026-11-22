
import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

interface JwtPayload {
    sub: string;
    membershipId?: string | null;
    merchantId?: string | null;
    storeId?: string | null;
    isPlatformAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid authentication token');
        }

        // Check whether the user exists and is active.
        const user = await this.prisma.user.findUnique({
            where: {
                id: payload.sub,
            },
        });

        if (!user || user.status !== 'ACTIVE') {
            throw new UnauthorizedException('User not found or inactive');
        }

        // Platform admin authentication.
        if (user.isPlatformAdmin) {
            if (!payload.isPlatformAdmin) {
                throw new UnauthorizedException('Invalid platform admin token');
            }

            return {
                sub: user.id,
                permissions: [],
                isPlatformAdmin: true,
            };
        }

        // Merchant users must have a valid membership.
        if (!payload.membershipId) {
            throw new UnauthorizedException('Membership information missing');
        }

        const membership = await this.prisma.userMembership.findFirst({
            where: {
                id: payload.membershipId,
                userId: user.id,
                merchantId: payload.merchantId ?? undefined,
                storeId: payload.storeId ?? null,
                status: 'ACTIVE',
            },
            include: {
                merchant: {
                    select: { status: true },
                },
                store: {
                    select: { status: true },
                },
                role: {
                    include: {
                        permissions: true,
                    },
                },
            },
        });

        if (
            !membership ||
            membership.merchant.status !== 'ACTIVE' ||
            (membership.storeId && membership.store?.status !== 'ACTIVE')
        ) {
            throw new UnauthorizedException('Invalid or inactive membership');
        }

        return {
            sub: user.id,
            membershipId: membership.id,
            merchantId: membership.merchantId,
            storeId: membership.storeId,
            role: membership.role.name,
            permissions: membership.role.permissions.map(
                (permission) => permission.name,
            ),
            isPlatformAdmin: false,
        };
    }
}
