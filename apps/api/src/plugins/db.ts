import fp from 'fastify-plugin';
import { DbService } from '$core/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: DbService;
  }
}

export const dbPlugin = fp(async (fastify) => {
  const db = new DbService();
  await db.connect();

  fastify.decorate('db', db);
  fastify.addHook('onClose', async () => {
    await db.close();
  });
});
