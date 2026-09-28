import type { FastifyPluginAsync } from 'fastify';
import {
  AcceptInviteSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RefreshSchema,
  ResetPasswordSchema,
  SwitchTenantSchema,
  type AcceptInvite,
  type ChangePassword,
  type ForgotPassword,
  type Login,
  type Refresh,
  type ResetPassword,
  type SwitchTenant,
} from '@stanforte/contract';
import { requireAuth } from '$core/auth/guards';
import { requestBody, requestQuery, responseAdapter } from '$core/routes';

export const AuthRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = () => fastify.container.auth;

  fastify.post('/login', { schema: { body: LoginSchema } }, async (request, reply) =>
    auth().login(requestBody<Login>(request), responseAdapter(reply)),
  );

  fastify.post('/refresh', { schema: { body: RefreshSchema } }, async (request, reply) =>
    auth().refresh(requestBody<Refresh>(request), request, responseAdapter(reply)),
  );

  fastify.post('/forgot-password', { schema: { body: ForgotPasswordSchema } }, async (request) =>
    auth().forgotPassword(requestBody<ForgotPassword>(request)),
  );

  fastify.post('/reset-password', { schema: { body: ResetPasswordSchema } }, async (request) =>
    auth().resetPassword(requestBody<ResetPassword>(request)),
  );

  fastify.post('/accept-invite', { schema: { body: AcceptInviteSchema } }, async (request) =>
    auth().acceptInvite(requestBody<AcceptInvite>(request)),
  );

  fastify.get('/google', async (_request, reply) => {
    const url = await auth().googleAuthUrl();
    return reply.redirect(url);
  });

  fastify.get('/google/callback', async (request, reply) => {
    const code = String(requestQuery<{ code?: string }>(request).code ?? '');
    const redirectUrl = await auth().handleGoogleCallback(code, responseAdapter(reply));
    return reply.redirect(redirectUrl);
  });

  fastify.get('/status', { preHandler: requireAuth }, async (request) =>
    auth().status(request.user.id),
  );

  fastify.get('/tenants', { preHandler: requireAuth }, async (request) =>
    auth().listTenants(request.user.id),
  );

  fastify.post(
    '/tenants/switch',
    { preHandler: requireAuth, schema: { body: SwitchTenantSchema } },
    async (request, reply) =>
      auth().switchTenant(request.user.id, requestBody<SwitchTenant>(request).tenant_id, responseAdapter(reply)),
  );

  fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) =>
    auth().logout(request.user.id, responseAdapter(reply)),
  );

  fastify.post(
    '/change-password',
    { preHandler: requireAuth, schema: { body: ChangePasswordSchema } },
    async (request) => auth().changePassword(request.user.id, requestBody<ChangePassword>(request)),
  );
};
