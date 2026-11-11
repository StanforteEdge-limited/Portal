import type { FastifyPluginAsync } from 'fastify';
import {
  AttachFileSchema,
  StorageListQuerySchema,
  type AttachFile,
  type StorageListQuery,
} from '@stanforte/contract';
import { composeGuards, requireAuth } from '$core/auth/guards';
import { requestBody, requestQuery } from '$core/routes';

export const StorageRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = () => fastify.container.storage;
  const auth = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  // List file assets
  fastify.get('/', { preHandler: auth, schema: { querystring: StorageListQuerySchema } }, async (request) => {
    return storage().list(requestQuery<StorageListQuery>(request));
  });

  // Presign upload URL for direct client-to-storage upload (no backend upload needed)
  fastify.post('/presign-upload', { preHandler: auth }, async (request) => {
    const body = request.body as {
      file_name: string;
      mime_type?: string;
      file_size?: number;
      expires_in_seconds?: number;
    };
    return storage().presignUpload(body);
  });

  // Alias for presign upload
  fastify.post('/upload/presign', { preHandler: auth }, async (request) => {
    const body = request.body as {
      file_name: string;
      mime_type?: string;
      file_size?: number;
      expires_in_seconds?: number;
    };
    return storage().presignUpload(body);
  });

  // Attach an uploaded file asset (after client uploaded directly via presigned URL)
  fastify.post('/attach', { preHandler: auth, schema: { body: AttachFileSchema } }, async (request) => {
    const body = requestBody<AttachFile>(request);
    const created = await storage().attach(actor(request), body);
    return { data: created, success: true };
  });

  // POST / also supports attaching
  fastify.post('/', { preHandler: auth, schema: { body: AttachFileSchema } }, async (request) => {
    const body = requestBody<AttachFile>(request);
    const created = await storage().attach(actor(request), body);
    return { data: created, success: true };
  });

  // Storage quota
  fastify.get('/quota', { preHandler: auth }, async () => {
    return storage().quota();
  });

  // Folder management
  fastify.get('/folders', { preHandler: auth }, async (request) => {
    return storage().listFolders(requestQuery<any>(request));
  });

  fastify.post('/folders', { preHandler: auth }, async (request) => {
    return storage().createFolder(actor(request), requestBody<any>(request));
  });

  fastify.patch('/folders/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return storage().renameFolder(id, requestBody<any>(request));
  });

  fastify.delete('/folders/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return storage().deleteFolder(id);
  });

  // File download presign
  fastify.get('/:id/presign-download', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    const query = requestQuery<{ expires_in_seconds?: number }>(request);
    return storage().presignDownload(id, query.expires_in_seconds ? Number(query.expires_in_seconds) : undefined);
  });

  fastify.get('/:id/download', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return storage().presignDownload(id);
  });

  // File detail & delete
  fastify.get('/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return storage().findOne(id);
  });

  fastify.delete('/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return storage().remove(id);
  });
};
