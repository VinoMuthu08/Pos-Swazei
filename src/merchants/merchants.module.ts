import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { MerchantsRepository } from './merchants.repository';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';

@Module({
  controllers: [MerchantsController],
  providers: [MerchantsService, MerchantsRepository, PlatformAdminGuard],
  exports: [MerchantsService, MerchantsRepository],
})
export class MerchantsModule {}