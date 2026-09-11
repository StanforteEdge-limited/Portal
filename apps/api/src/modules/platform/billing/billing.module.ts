import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaystackService } from './paystack.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, PaystackService],
  exports: [BillingService],
})
export class BillingModule {}
