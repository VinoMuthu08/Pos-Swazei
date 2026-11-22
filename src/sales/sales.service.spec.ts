import { ConflictException, NotFoundException } from '@nestjs/common';
import { IdempotencyStatus, PaymentMethod, PaymentStatus, Prisma, SaleStatus } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { PrismaService } from '../prisma/prisma.service';
import type { PaymentProvider } from '../common/interfaces/payment-provider.interface';
import { SalesService } from './sales.service';

const user: AuthenticatedUser = {
  sub: 'user-1',
  membershipId: 'membership-1',
  merchantId: 'merchant-1',
  storeId: 'store-1',
  permissions: ['sale:create', 'sale:read'],
  isPlatformAdmin: false,
};

const dto = {
  items: [{ productId: 'product-1', quantity: 2 }],
  paymentMethod: PaymentMethod.CASH,
};

describe('SalesService', () => {
  let service: SalesService;
  let prisma: {
    idempotencyKey: { findUnique: jest.Mock };
    sale: { findFirst: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let transaction: {
    idempotencyKey: { create: jest.Mock; update: jest.Mock };
    store: { findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    storeInventory: { updateMany: jest.Mock };
    sale: {
      create: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    payment: { create: jest.Mock };
  };
  let paymentProvider: { processPayment: jest.Mock };
  const completedSale = {
    id: 'sale-1',
    status: SaleStatus.COMPLETED,
    total: new Prisma.Decimal('20.00'),
    items: [],
    payment: { status: PaymentStatus.SUCCESS },
  };

  beforeEach(() => {
    transaction = {
      idempotencyKey: {
        create: jest.fn().mockResolvedValue({ id: 'idempotency-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'store-1' }) },
      product: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'product-1', price: new Prisma.Decimal('10.00') },
        ]),
      },
      storeInventory: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      sale: {
        create: jest.fn().mockResolvedValue({ id: 'sale-1' }),
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn().mockResolvedValue(completedSale),
      },
      payment: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null) },
      sale: { findFirst: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    paymentProvider = {
      processPayment: jest.fn().mockResolvedValue({
        status: PaymentStatus.SUCCESS,
        provider: 'MOCK',
        transactionId: 'mock-tx-1',
        message: 'Payment accepted',
      }),
    };
    service = new SalesService(
      prisma as unknown as PrismaService,
      paymentProvider as unknown as PaymentProvider,
    );
  });

  it('creates a sale using server product prices and decrements stock', async () => {
    const result = await service.create(dto, user, 'request-1');

    expect(result).toBe(completedSale);
    expect(transaction.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          total: new Prisma.Decimal('20.00'),
          items: {
            create: [
              expect.objectContaining({
                quantity: 2,
                unitPrice: new Prisma.Decimal('10.00'),
                subtotal: new Prisma.Decimal('20.00'),
              }),
            ],
          },
        }),
      }),
    );
    expect(transaction.storeInventory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ quantity: { gte: 2 } }),
        data: { quantity: { decrement: 2 } },
      }),
    );
    expect(transaction.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: SaleStatus.COMPLETED } }),
    );
  });

  it('records a declined payment and restores the reserved inventory', async () => {
    const failedSale = {
      ...completedSale,
      status: SaleStatus.PAYMENT_FAILED,
      payment: { status: PaymentStatus.FAILED },
    };
    transaction.sale.findUniqueOrThrow.mockResolvedValue(failedSale);
    paymentProvider.processPayment.mockResolvedValue({
      status: PaymentStatus.FAILED,
      provider: 'MOCK',
      transactionId: 'mock-tx-2',
      message: 'Mock payment declined',
    });

    const result = await service.create(dto, user, 'request-2');

    expect(result.status).toBe(SaleStatus.PAYMENT_FAILED);
    expect(transaction.storeInventory.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { quantity: { increment: 2 } },
      }),
    );
    expect(transaction.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { saleId: 'sale-1', status: IdempotencyStatus.FAILED },
      }),
    );
  });

  it('rejects insufficient stock without requesting payment', async () => {
    transaction.storeInventory.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.create(dto, user, 'request-3')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(paymentProvider.processPayment).not.toHaveBeenCalled();
  });

  it('does not expose a sale from another tenant', async () => {
    prisma.sale.findFirst.mockResolvedValue(null);

    await expect(service.findOne('other-sale', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.sale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'other-sale',
          merchantId: 'merchant-1',
          storeId: 'store-1',
        },
      }),
    );
  });

  it('replays a duplicate request without creating another sale', async () => {
    const first = await service.create(dto, user, 'request-4');
    const requestHash = transaction.idempotencyKey.create.mock.calls[0][0].data
      .requestHash;
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      requestHash,
      status: IdempotencyStatus.COMPLETED,
      sale: completedSale,
    });

    const replay = await service.create(dto, user, 'request-4');

    expect(replay).toBe(first);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(paymentProvider.processPayment).toHaveBeenCalledTimes(1);
  });
});
