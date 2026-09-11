import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

type PaystackResponse<T> = { status: boolean; message: string; data: T };

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';

  private get secretKey() {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) throw new BadGatewayException('Payment provider is not configured');
    return key;
  }

  async initialize(input: {
    email: string;
    amountMinor: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, string>;
  }) {
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
    return result.data;
  }

  verifySignature(rawBody: Buffer, signature: string | undefined) {
    if (!signature) throw new UnauthorizedException('Missing payment signature');
    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    const provided = Buffer.from(signature, 'utf8');
    const calculated = Buffer.from(expected, 'utf8');
    if (provided.length !== calculated.length || !timingSafeEqual(provided, calculated)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
  }
}
