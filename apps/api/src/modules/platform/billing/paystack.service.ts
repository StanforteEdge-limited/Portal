import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  PaymentCheckoutRequest,
  PaymentCheckoutResult,
  PaymentGatewayAdapter,
  PaymentWebhookEvent,
} from './payment-gateway.adapter';

type PaystackResponse<T> = { status: boolean; message: string; data: T };

@Injectable()
export class PaystackService implements PaymentGatewayAdapter {
  readonly name = 'paystack';
  private readonly baseUrl = 'https://api.paystack.co';

  private get secretKey() {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) throw new BadGatewayException('Payment provider is not configured');
    return key;
  }

  async initializeCheckout(input: PaymentCheckoutRequest): Promise<PaymentCheckoutResult> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });
    const result = (await response.json()) as PaystackResponse<{ authorization_url: string; access_code: string; reference: string }>;
    if (!response.ok || !result.status) throw new BadGatewayException(result.message || 'Payment initialization failed');
    return {
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference: result.data.reference,
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!signature) throw new UnauthorizedException('Missing payment signature');
    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    const provided = Buffer.from(signature, 'utf8');
    const calculated = Buffer.from(expected, 'utf8');
    if (provided.length !== calculated.length || !timingSafeEqual(provided, calculated)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
  }

  parseWebhook(rawBody: Buffer): PaymentWebhookEvent {
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      data?: { reference?: string; amount?: number; currency?: string };
    };
    if (!event.event) throw new UnauthorizedException('Payment event type is missing');
    const reference = event.data?.reference;
    return {
      eventId: `${event.event}:${reference ?? rawBody.toString('base64url').slice(0, 80)}`,
      type: event.event,
      reference,
      amountMinor: event.data?.amount,
      currency: event.data?.currency,
      payload: event as unknown as Record<string, unknown>,
    };
  }
}
