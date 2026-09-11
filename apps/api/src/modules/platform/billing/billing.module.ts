import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaystackService } from './paystack.service';
import { PaymentGatewayModule } from './payment-gateway.module';

@Module({
  controllers: [BillingController],
  imports: [PaymentGatewayModule],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
