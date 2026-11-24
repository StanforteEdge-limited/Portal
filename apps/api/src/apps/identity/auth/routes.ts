import type { FastifyPluginAsync } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RefreshSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  SwitchTenantSchema,
  VerifyEmailSchema,
  type ChangePassword,
  type ForgotPassword,
  type Login,
  type Refresh,
  type ResendVerification,
  type ResetPassword,
  type SwitchTenant,
  type VerifyEmail,
} from '@stanforte/contract';
import { requireAuth } from '$core/auth/guards';
import { authCookieOptions, clearAuthCookieOptions, parseCookieHeader } from '$core/auth/cookies';
import { config } from '$config/index';
import { randomToken } from '$core/utils';
import { requestBody, requestQuery, responseAdapter } from '$core/routes';

const OAUTH_STATE_COOKIE = 'se_oauth_state';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const AuthRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = () => fastify.container.auth;

  fastify.post(
    '/login',
    {
      schema: { body: LoginSchema },
      config: {
        rateLimit: {
          max: config.rateLimit.auth.loginMax,
          timeWindow: config.rateLimit.auth.windowMs,
        },
      },
    },
    async (request, reply) => auth().login(requestBody<Login>(request), responseAdapter(reply)),
  );

  fastify.post('/refresh', { schema: { body: RefreshSchema } }, async (request, reply) =>
    auth().refresh(requestBody<Refresh>(request), request, responseAdapter(reply)),
  );

  fastify.post(
    '/forgot-password',
    {
      schema: { body: ForgotPasswordSchema },
      config: {
        rateLimit: {
          max: config.rateLimit.auth.forgotMax,
          timeWindow: config.rateLimit.auth.windowMs,
        },
      },
    },
    async (request) => auth().forgotPassword(requestBody<ForgotPassword>(request)),
  );

  fastify.post(
    '/reset-password',
    {
      schema: { body: ResetPasswordSchema },
      config: {
        rateLimit: {
          max: config.rateLimit.auth.forgotMax,
          timeWindow: config.rateLimit.auth.windowMs,
        },
      },
    },
    async (request) => auth().resetPassword(requestBody<ResetPassword>(request)),
  );

  fastify.post(
    '/verify-email',
    {
      schema: { body: VerifyEmailSchema },
      config: {
        rateLimit: {
          max: config.rateLimit.auth.inviteMax,
          timeWindow: config.rateLimit.auth.windowMs,
        },
      },
    },
    async (request) => auth().verifyEmail(requestBody<VerifyEmail>(request)),
  );

  fastify.post(
    '/resend-verification',
    {
      schema: { body: ResendVerificationSchema },
      config: {
        rateLimit: {
          max: config.rateLimit.auth.forgotMax,
          timeWindow: config.rateLimit.auth.windowMs,
        },
      },
    },
    async (request) => auth().resendVerification(requestBody<ResendVerification>(request)),
  );

  fastify.get('/google', async (_request, reply) => {
    const state = randomToken(32);
    reply.setCookie(OAUTH_STATE_COOKIE, state, authCookieOptions(600));
    const url = await auth().googleAuthUrl(state);
    return reply.redirect(url);
  });

  fastify.get('/google/callback', async (request, reply) => {
    const query = requestQuery<{ code?: string; state?: string }>(request);
    const code = String(query.code ?? '');
    const state = String(query.state ?? '');
    const cookieState = parseCookieHeader(request.headers.cookie)[OAUTH_STATE_COOKIE] ?? '';
    reply.clearCookie(OAUTH_STATE_COOKIE, clearAuthCookieOptions());

    if (!state || !cookieState || !safeEqual(state, cookieState)) {
      const appUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
      return reply.redirect(`${appUrl}/login?error=invalid_oauth_state`);
    }

    const redirectUrl = await auth().handleGoogleCallback(code, responseAdapter(reply));
    return reply.redirect(redirectUrl);
  });

  fastify.get('/status', { preHandler: requireAuth }, async (request) =>
    auth().status(request.user.id, request.user.tenantId),
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
