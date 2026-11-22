import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './user.repository';
import { ForbiddenException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    findActiveMembership: jest.Mock;
    findActiveStore: jest.Mock;
    findActiveMerchant: jest.Mock;
    findActiveRoleByName: jest.Mock;
    findByEmail: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    usersRepository = {
      findActiveMembership: jest.fn(),
      findActiveStore: jest.fn(),
      findActiveMerchant: jest.fn(),
      findActiveRoleByName: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lets a merchant owner create a store manager in a selected store', async () => {
    usersRepository.findActiveMembership.mockResolvedValue({
      merchantId: 'merchant-1',
      storeId: null,
      role: { name: 'MERCHANT_OWNER' },
    });
    usersRepository.findActiveStore.mockResolvedValue({ id: 'store-1' });
    usersRepository.findActiveRoleByName.mockResolvedValue({ id: 'role-1' });
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue({ id: 'user-1' });

    await service.create(
      {
        name: 'Manager',
        email: 'manager@example.com',
        password: 'password123',
        role: 'STORE_MANAGER',
        storeId: 'store-1',
      },
      {
        sub: 'user-owner',
        membershipId: 'membership-1',
        merchantId: 'merchant-1',
        permissions: [],
        isPlatformAdmin: false,
      },
    );

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'manager@example.com' }),
      { merchantId: 'merchant-1', storeId: 'store-1', roleId: 'role-1' },
    );
  });

  it('does not let a merchant owner create another owner', async () => {
    usersRepository.findActiveMembership.mockResolvedValue({
      merchantId: 'merchant-1',
      storeId: null,
      role: { name: 'MERCHANT_OWNER' },
    });

    await expect(
      service.create(
        {
          name: 'Another owner',
          email: 'owner@example.com',
          password: 'password123',
          role: 'MERCHANT_OWNER',
          storeId: 'store-1',
        },
        {
          sub: 'user-owner',
          membershipId: 'membership-1',
          merchantId: 'merchant-1',
          permissions: [],
          isPlatformAdmin: false,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('does not let a store manager create another manager', async () => {
    usersRepository.findActiveMembership.mockResolvedValue({
      merchantId: 'merchant-1',
      storeId: 'store-1',
      role: { name: 'STORE_MANAGER' },
    });

    await expect(
      service.create(
        {
          name: 'Another manager',
          email: 'manager@example.com',
          password: 'password123',
          role: 'STORE_MANAGER',
        },
        {
          sub: 'user-manager',
          membershipId: 'membership-1',
          merchantId: 'merchant-1',
          storeId: 'store-1',
          permissions: [],
          isPlatformAdmin: false,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('lets a platform admin create a merchant owner without a membership', async () => {
    usersRepository.findActiveMerchant.mockResolvedValue({ id: 'merchant-1' });
    usersRepository.findActiveRoleByName.mockResolvedValue({ id: 'role-owner' });
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue({ id: 'user-owner' });

    await service.create(
      {
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password123',
        role: 'MERCHANT_OWNER',
        merchantId: 'merchant-1',
      },
      {
        sub: 'platform-admin',
        permissions: [],
        isPlatformAdmin: true,
      },
    );

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'owner@example.com' }),
      { merchantId: 'merchant-1', storeId: null, roleId: 'role-owner' },
    );
    expect(usersRepository.findActiveMembership).not.toHaveBeenCalled();
  });
});
