
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  IdempotencyStatus,
  PaymentStatus,
  Prisma,
  RecordStatus,
  SaleStatus,
} from '../generated/prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PAYMENT_PROVIDER } from '../common/interfaces/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesRepository } from './sales.repository';
import { MockPaymentProvider } from '../payments/payments.provider';


@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesRepository: SalesRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: MockPaymentProvider,
  ) { }

  async create(
    dto: CreateSaleDto,
    user: AuthenticatedUser,
    requestKey: string | undefined,
  ) {
    // Check user's store access
    if (!user.merchantId || !user.storeId || !user.membershipId) {
      throw new ForbiddenException('Valid store membership is required');
    }

    const merchantId = user.merchantId;
    const storeId = user.storeId;

    // Check idempotency key
    const key = requestKey?.trim();

    if (!key || key.length > 255) {
      throw new BadRequestException('Idempotency-Key is required');
    }

    // Generate request hash
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          items: [...dto.items].sort((a, b) =>
            a.productId.localeCompare(b.productId),
          ),
          paymentMethod: dto.paymentMethod,
        }),
      )
      .digest('hex');

    // Check whether this request was already processed
    const existingRequest =
      await this.salesRepository.findIdempotencyKey(
        merchantId,
        storeId,
        key,
      );

    if (existingRequest) {
      if (existingRequest.requestHash !== requestHash) {
        throw new ConflictException(
          'This Idempotency-Key was used for another request',
        );
      }

      if (!existingRequest.sale) {
        throw new ConflictException('Sale request is still processing');
      }

      return existingRequest.sale;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {

        const store = await tx.store.findFirst({
          where: {
            id: storeId,
            merchantId,
            status: RecordStatus.ACTIVE,
          },
        });

        if (!store) {
          throw new NotFoundException('Store not found');
        }

        const idempotency = await tx.idempotencyKey.create({
          data: {
            key,
            requestHash,
            merchantId,
            storeId,
          },
        });

        const membership = await tx.userMembership.findFirst({
          where: {
            id: user.membershipId!,
            userId: user.sub,
            merchantId,
            storeId,
          },
        });

        if (!membership) {
          throw new ForbiddenException('Invalid store membership');
        }

        const products = await tx.product.findMany({
          where: {
            id: {
              in: dto.items.map((item) => item.productId),
            },
            merchantId,
            status: RecordStatus.ACTIVE,
          },
        });

        if (products.length !== new Set(dto.items.map((i) => i.productId)).size) {
          throw new NotFoundException('One or more products were not found');
        }

        let total = new Prisma.Decimal(0);
        const saleItems = [];

        for (const item of dto.items) {
          const product = products.find(
            (p) => p.id === item.productId,
          );

          if (!product) {
            throw new NotFoundException('Product not found');
          }

          const subtotal = product.price.mul(item.quantity);
          total = total.plus(subtotal);

          saleItems.push({
            merchantId,
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.price,
            subtotal,
          });
        }

        // Deduct inventory
        for (const item of dto.items) {
          const inventory = await tx.storeInventory.updateMany({
            where: {
              merchantId,
              storeId,
              productId: item.productId,
              quantity: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
            },
          });

          if (inventory.count !== 1) {
            throw new ConflictException(
              `Insufficient stock for product ${item.productId}`,
            );
          }
        }

        // Create sale
        const sale = await tx.sale.create({
          data: {
            total,
            status: SaleStatus.PENDING,
            merchantId,
            storeId,
            createdById: user.sub,
            creatorMembershipId: user.membershipId!,
            items: {
              create: saleItems,
            },
          },
        });

        // Process mock payment
        const payment = await this.paymentProvider.processPayment({
          amount: total.toNumber(),
          method: dto.paymentMethod,
          reference: sale.id,
        });

        // Restore stock if payment failed
        if (payment.status === PaymentStatus.FAILED) {
          for (const item of dto.items) {
            await tx.storeInventory.updateMany({
              where: {
                merchantId,
                storeId,
                productId: item.productId,
              },
              data: {
                quantity: { increment: item.quantity },
              },
            });
          }
        }

        // Save payment
        await tx.payment.create({
          data: {
            amount: total,
            method: dto.paymentMethod,
            status: payment.status,
            provider: payment.provider,
            transactionId: payment.transactionId,
            message: payment.message,
            saleId: sale.id,
          },
        });

        // Update sale status
        const saleStatus =
          payment.status === PaymentStatus.SUCCESS
            ? SaleStatus.COMPLETED
            : SaleStatus.PAYMENT_FAILED;

        await tx.sale.update({
          where: { id: sale.id },
          data: { status: saleStatus },
        });

        // Update idempotency status
        await tx.idempotencyKey.update({
          where: { id: idempotency.id },
          data: {
            saleId: sale.id,
            status:
              payment.status === PaymentStatus.SUCCESS
                ? IdempotencyStatus.COMPLETED
                : IdempotencyStatus.FAILED,
          },
        });

        return tx.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            payment: true,
          },
        });
      });
    } catch (error) {
      // Handle two requests using the same key at the same time
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingRequest =
          await this.salesRepository.findIdempotencyKey(
            merchantId,
            storeId,
            key,
          );

        if (existingRequest?.requestHash === requestHash && existingRequest.sale) {
          return existingRequest.sale;
        }
      }

      throw error;
    }
  }

  findAll(user: AuthenticatedUser) {
    if (!user.merchantId || !user.storeId) {
      throw new ForbiddenException('Valid store membership is required');
    }

    return this.salesRepository.findAll(
      user.merchantId,
      user.storeId,
    );
  }

  findOne(id: string, user: AuthenticatedUser) {
    if (!user.merchantId || !user.storeId) {
      throw new ForbiddenException('Valid store membership is required');
    }

    return this.salesRepository.findOne(
      id,
      user.merchantId,
      user.storeId,
    );
  }
}
