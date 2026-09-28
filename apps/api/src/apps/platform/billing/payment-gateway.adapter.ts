export interface PaymentCheckoutRequest {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

export interface PaymentCheckoutResult {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
}

export interface PaymentWebhookEvent {
  eventId: string;
  type: string;
  reference?: string;
  amountMinor?: number;
  currency?: string;
  payload: Record<string, unknown>;
}

export interface PaymentGatewayAdapter {
  readonly name: string;
  initializeCheckout(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResult>;
  verifyWebhook(rawBody: Buffer, signature?: string): void;
  parseWebhook(rawBody: Buffer): PaymentWebhookEvent;
}

export const PAYMENT_GATEWAY_ADAPTER = Symbol('PAYMENT_GATEWAY_ADAPTER');
