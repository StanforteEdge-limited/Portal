import type { FastifyPluginAsync } from 'fastify';
import { currentTenant, requireAuth } from '$core/auth/guards';
import { requestBody } from '$core/routes';

export const BillingRoutes: FastifyPluginAsync = async (fastify) => {
  const billing = () => fastify.container.billing;

  fastify.get('/plans', async () => {
    return billing().listPlans();
  });

  fastify.get('/subscription', { preHandler: requireAuth }, async (request) => {
    return billing().getCurrent(currentTenant(request));
  });

  fastify.post('/checkout', { preHandler: requireAuth }, async (request) => {
    const body = requestBody<{ plan?: string }>(request);
    return billing().createCheckout(currentTenant(request), body?.plan);
  });

  fastify.post('/change-plan', { preHandler: requireAuth }, async (request) => {
    const body = requestBody<{ plan: string }>(request);
    return billing().changePlan(currentTenant(request), body as any);
  });

  fastify.post('/cancel', { preHandler: requireAuth }, async (request) => {
    return billing().cancel(currentTenant(request));
  });

  fastify.post('/webhook/paystack', async (request) => {
    const rawBody = Buffer.from(
      typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {}),
      'utf8',
    );
    const signature = request.headers['x-paystack-signature'];
    const sig = Array.isArray(signature) ? signature[0] : signature;
    return billing().handlePaystackWebhook(rawBody, sig);
  });
};
