import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '../common/interfaces/payment-provider.interface';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
} from '../common/interfaces/payment-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  processPayment(request: PaymentRequest): Promise<PaymentResult> {
    return this.paymentProvider.processPayment(request);
  }
}
