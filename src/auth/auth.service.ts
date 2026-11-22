import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/user.repository';
import { LoginDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) { }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findByEmail(loginDto.email);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isPlatformAdmin) {
      return await this.generateToken({
        sub: user.id,
        isPlatformAdmin: true,
      });
    }

    const memberships = user.memberships.filter(
      (membership) =>
        membership.merchant.status === 'ACTIVE' &&
        (!membership.store || membership.store.status === 'ACTIVE'),
    );

    if (!memberships.length) {
      throw new UnauthorizedException('No active membership found');
    }

    let membership;

    if (loginDto.membershipId) {
      membership = memberships.find(
        (item) => item.id === loginDto.membershipId,
      );

      if (!membership) {
        throw new UnauthorizedException('Invalid membership selection');
      }
    } else if (memberships.length === 1) {
      membership = memberships[0];
    } else {
      throw new BadRequestException("Please selection needed or membership not found")
    }

    return await this.generateToken({
      sub: user.id,
      membershipId: membership.id,
      merchantId: membership.merchantId,
      storeId: membership.storeId,
      isPlatformAdmin: false,
    });
  }

  private async generateToken(payload: Record<string, unknown>) {
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }
}