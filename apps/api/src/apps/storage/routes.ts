import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AttachFileSchema,
  StorageListQuerySchema,
  type AttachFile,
  type StorageListQuery,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth } from '$core/auth/guards';
import { requestBody, requestQuery } from '$core/routes';

export const StorageRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = () => fastify.container.storage;
  const auth = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const inTenant = <T>(request: FastifyRequest, operation: () => Promise<T> | T) => {
    try {
      const t = currentTenant(request);
      return fastify.container.tenantContext.run(t, operation);
    } catch {
      return operation();
    }
  };

  // List file assets
  fastify.get('/', { preHandler: auth, schema: { querystring: StorageListQuerySchema } }, async (request) => {
    return inTenant(request, () => storage().list(requestQuery<StorageListQuery>(request)));
  });

  // Presign upload URL for direct client-to-storage upload (no backend upload needed)
  fastify.post('/presign-upload', { preHandler: auth }, async (request) => {
    const body = request.body as {
      file_name: string;
      mime_type?: string;
      file_size?: number;
      expires_in_seconds?: number;
    };
    return inTenant(request, () => storage().presignUpload(body));
  });

  // Alias for presign upload
  fastify.post('/upload/presign', { preHandler: auth }, async (request) => {
    const body = request.body as {
      file_name: string;
      mime_type?: string;
      file_size?: number;
      expires_in_seconds?: number;
    };
    return inTenant(request, () => storage().presignUpload(body));
  });

  // Attach an uploaded file asset (after client uploaded directly via presigned URL)
  fastify.post('/attach', { preHandler: auth, schema: { body: AttachFileSchema } }, async (request) => {
    const body = requestBody<AttachFile>(request);
    return inTenant(request, async () => {
      const created = await storage().attach(actor(request), body);
      return { data: created, success: true };
    });
  });

  // POST / also supports attaching
  fastify.post('/', { preHandler: auth, schema: { body: AttachFileSchema } }, async (request) => {
    const body = requestBody<AttachFile>(request);
    return inTenant(request, async () => {
      const created = await storage().attach(actor(request), body);
      return { data: created, success: true };
    });
  });

  // Storage quota
  fastify.get('/quota', { preHandler: auth }, async (request) => {
    return inTenant(request, () => storage().quota());
  });

  // Folder management
  fastify.get('/folders', { preHandler: auth }, async (request) => {
    return inTenant(request, () => storage().listFolders(requestQuery<any>(request)));
  });

  fastify.post('/folders', { preHandler: auth }, async (request) => {
    return inTenant(request, () => storage().createFolder(actor(request), requestBody<any>(request)));
  });

  fastify.patch('/folders/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().renameFolder(id, requestBody<any>(request)));
  });

  fastify.delete('/folders/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().deleteFolder(id));
  });

  // File download presign
  fastify.get('/:id/presign-download', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    const query = requestQuery<{ expires_in_seconds?: number }>(request);
    return inTenant(request, () =>
      storage().presignDownload(id, query.expires_in_seconds ? Number(query.expires_in_seconds) : undefined)
    );
  });

  fastify.get('/:id/download', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().presignDownload(id));
  });

  // File detail & delete
  fastify.get('/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().findOne(id));
  });

  fastify.delete('/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().remove(id));
  });
};
