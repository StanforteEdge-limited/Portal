import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '$core/auth/guards';
import { authenticatedUserId, requestParams, requestQuery } from '$core/routes';

export const MailRoutes: FastifyPluginAsync = async (fastify) => {
  const mailAccounts = () => fastify.container.mailAccounts;
  const userBigIntId = (req: Parameters<typeof authenticatedUserId>[0]) =>
    BigInt(authenticatedUserId(req));

  fastify.get('/accounts', { preHandler: requireAuth }, async (request) => {
    return mailAccounts().listAccounts(userBigIntId(request));
  });

  fastify.delete('/accounts/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    await mailAccounts().deleteAccount(BigInt(id), userBigIntId(request));
    return { deleted: true };
  });

  fastify.get('/auth/google/url', { preHandler: requireAuth }, async (request) => {
    return { url: mailAccounts().getGoogleAuthUrl(userBigIntId(request)) };
  });

  fastify.get('/auth/microsoft/url', { preHandler: requireAuth }, async (request) => {
    return { url: mailAccounts().getMicrosoftAuthUrl(userBigIntId(request)) };
  });

  fastify.post('/sync', { preHandler: requireAuth }, async () => ({ job_id: null, synced: true }));
  fastify.post('/:accountId/sync', { preHandler: requireAuth }, async () => ({ job_id: null, synced: true }));

  fastify.get('/:accountId/folders', { preHandler: requireAuth }, async () => [
    { name: 'Inbox', path: 'INBOX', delimiter: '/' },
    { name: 'Sent', path: 'Sent', delimiter: '/' },
    { name: 'Drafts', path: 'Drafts', delimiter: '/' },
  ]);

  fastify.get('/:accountId/headers', { preHandler: requireAuth }, async (request) => {
    const q = requestQuery(request);
    return { data: [], folder: q.folder || 'INBOX', page: Number(q.page || 1) };
  });
};
