import { Global, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY_ADAPTER } from './payment-gateway.adapter';
import { PaystackService } from './paystack.service';

@Global()
@Module({
  providers: [
    PaystackService,
    {
      provide: PAYMENT_GATEWAY_ADAPTER,
      useExisting: PaystackService,
    },
  ],
  exports: [PAYMENT_GATEWAY_ADAPTER],
})
export class PaymentGatewayModule {}
