import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '$core/auth/guards';
import { requestParams, requestQuery } from '$core/routes';

export const MailRoutes: FastifyPluginAsync = async (fastify) => {
  const mailAccounts = () => fastify.container.mailAccounts;

  fastify.get('/accounts', { preHandler: requireAuth }, async (request) => {
    const profileId = BigInt(String((request.user as any)?.id));
    return mailAccounts().listAccounts(profileId);
  });

  fastify.delete('/accounts/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    const profileId = BigInt(String((request.user as any)?.id));
    await mailAccounts().deleteAccount(BigInt(id), profileId);
    return { deleted: true };
  });

  fastify.get('/auth/google/url', { preHandler: requireAuth }, async (request) => {
    const profileId = BigInt(String((request.user as any)?.id));
    return { url: mailAccounts().getGoogleAuthUrl(profileId) };
  });

  fastify.get('/auth/microsoft/url', { preHandler: requireAuth }, async (request) => {
    const profileId = BigInt(String((request.user as any)?.id));
    return { url: mailAccounts().getMicrosoftAuthUrl(profileId) };
  });

  fastify.post('/sync', { preHandler: requireAuth }, async () => {
    return { job_id: null, synced: true };
  });

  fastify.post('/:accountId/sync', { preHandler: requireAuth }, async () => {
    return { job_id: null, synced: true };
  });

  fastify.get('/:accountId/folders', { preHandler: requireAuth }, async () => {
    return [
      { name: 'Inbox', path: 'INBOX', delimiter: '/' },
      { name: 'Sent', path: 'Sent', delimiter: '/' },
      { name: 'Drafts', path: 'Drafts', delimiter: '/' },
    ];
  });

  fastify.get('/:accountId/headers', { preHandler: requireAuth }, async (request) => {
    const q = requestQuery(request);
    return { data: [], folder: q.folder || 'INBOX', page: Number(q.page || 1) };
  });
};
