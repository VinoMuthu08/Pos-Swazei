import { PaymentMethod, PaymentStatus } from '../../generated/prisma/client';

export interface PaymentRequest {
  amount: number;
  method: PaymentMethod;
  reference: string;
}

export interface PaymentResult {
  status: PaymentStatus;
  provider: string;
  transactionId: string;
  message: string;
}

export interface PaymentProvider {
  processPayment(
    request: PaymentRequest,
  ): Promise<PaymentResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');