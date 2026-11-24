import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  AttachFileSchema,
  StorageListQuerySchema,
  type AttachFile,
  type StorageListQuery,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestQuery } from '$core/routes';
import { storagePermissions } from './permissions';

const PresignUploadSchema = Type.Object({
  file_name: Type.String({ minLength: 1, maxLength: 255 }),
  mime_type: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  file_size: Type.Optional(Type.Number({ minimum: 1, maximum: 50 * 1024 * 1024 })),
  expires_in_seconds: Type.Optional(Type.Number({ minimum: 30, maximum: 900 })),
});

export const StorageRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = () => fastify.container.storage;
  const auth = composeGuards(requireAuth);
  const manageFolders = composeGuards(
    requireAuth,
    requirePermissions(storagePermissions.write, 'files.write', 'files.manage'),
  );
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const hasPermission = (request: FastifyRequest, allowed: string[]) => {
    const perms = (request.user as any)?.permissions ?? [];
    return perms.includes('*') || allowed.some((p) => perms.includes(p));
  };
  const inTenant = <T>(request: FastifyRequest, operation: () => Promise<T> | T) => {
    const t = currentTenant(request);
    return fastify.container.tenantContext.run(t, operation);
  };

  // List file assets (non-admins are scoped to their own uploads)
  fastify.get('/', { preHandler: auth, schema: { querystring: StorageListQuerySchema } }, async (request) => {
    const query = requestQuery<StorageListQuery>(request);
    const canViewAll = hasPermission(request, [storagePermissions.read, 'files.read', 'files.view']);
    return inTenant(request, () =>
      storage().list(canViewAll ? query : { ...query, uploaded_by: actor(request) }),
    );
  });

  // Presign upload URL for direct client-to-storage upload
  fastify.post('/presign-upload', { preHandler: auth, schema: { body: PresignUploadSchema } }, async (request) => {
    const body = requestBody<{
      file_name: string;
      mime_type?: string;
      file_size?: number;
      expires_in_seconds?: number;
    }>(request);
    return inTenant(request, () => storage().presignUpload(body));
  });

  // Alias for presign upload
  fastify.post('/upload/presign', { preHandler: auth, schema: { body: PresignUploadSchema } }, async (request) => {
    const body = requestBody<{
      file_name: string;
      mime_type?: string;
      file_size?: number;
      expires_in_seconds?: number;
    }>(request);
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

  fastify.post('/folders', { preHandler: manageFolders }, async (request) => {
    return inTenant(request, () => storage().createFolder(actor(request), requestBody<any>(request)));
  });

  fastify.patch('/folders/:id', { preHandler: manageFolders }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().renameFolder(id, requestBody<any>(request)));
  });

  fastify.delete('/folders/:id', { preHandler: manageFolders }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().deleteFolder(id));
  });

  // File download / inline preview presign
  fastify.get('/:id/presign-download', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    const query = requestQuery<{ expires_in_seconds?: number; inline?: string | boolean }>(request);
    const inline = query.inline === true || query.inline === 'true' || query.inline === '1';
    return inTenant(request, () =>
      storage().presignDownload(
        id,
        query.expires_in_seconds ? Math.min(3600, Math.max(30, Number(query.expires_in_seconds))) : undefined,
        inline,
      ),
    );
  });

  fastify.get('/:id/download', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().presignDownload(id));
  });

  // File detail & delete (delete requires ownership or storage:write)
  fastify.get('/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => storage().findOne(id));
  });

  fastify.delete('/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    const canDeleteAny = hasPermission(request, [storagePermissions.write, 'files.delete', 'files.manage']);
    return inTenant(request, () => storage().remove(id, actor(request), canDeleteAny));
  });
};
