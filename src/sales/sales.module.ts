import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { SalesRepository } from './sales.repository';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
})
export class SalesModule { }
