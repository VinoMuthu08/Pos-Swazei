import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PaymentStatus } from '../generated/prisma/client';
import {
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
} from '../common/interfaces/payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly config: ConfigService) {}

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const successful =
      this.config.getOrThrow<string>('MOCK_PAYMENT_MODE') === 'SUCCESS';
    return {
      status: successful ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
      provider: 'MOCK',
      transactionId: `mock-${randomUUID()}`,
      message: successful
        ? `Payment of ${request.amount.toFixed(2)} processed successfully`
        : 'Mock payment declined',
    };
  }
}
