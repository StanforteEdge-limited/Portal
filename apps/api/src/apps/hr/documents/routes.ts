import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AcknowledgeDocumentSchema,
  CreateDocumentSchema,
  DocumentsListQuerySchema,
  UpdateDocumentSchema,
  documentsIdParamsSchema,
  type AcknowledgeDocument,
  type CreateDocument,
  type DocumentsListQuery,
  type UpdateDocument,
  type documentsIdParams,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { documentsPermissions } from './permissions';

/**
 * Mounted at `/v1/documents`.
 *
 * Reads are scoped to what the caller may see, so the list and detail methods
 * take the caller's profile id. `acknowledge` also needs the raw request for
 * the IP and user-agent stamped onto the acknowledgement row.
 */
export const DocumentsRoutes: FastifyPluginAsync = async (fastify) => {
  const documents = () => fastify.container.documents;
  const self = composeGuards(requireAuth);
  const read = composeGuards(requireAuth, requirePermissions(documentsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(documentsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<documentsIdParams>(request).id;
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const inTenant = <T>(request: FastifyRequest, op: () => Promise<T> | T) =>
    fastify.container.tenantContext.run(currentTenant(request), op);

  fastify.get('/', { preHandler: read, schema: { querystring: DocumentsListQuerySchema } }, async (request) =>
    inTenant(request, () => documents().list(actor(request), requestQuery<DocumentsListQuery>(request))),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreateDocumentSchema } }, async (request) =>
    inTenant(request, () => documents().create(requestBody<CreateDocument>(request), actor(request))),
  );

  fastify.get('/:id', { preHandler: self, schema: { params: documentsIdParamsSchema } }, async (request) =>
    inTenant(request, () => documents().get(actor(request), id(request))),
  );

  fastify.put('/:id', { preHandler: write, schema: { params: documentsIdParamsSchema, body: UpdateDocumentSchema } }, async (request) =>
    inTenant(request, () => documents().update(id(request), requestBody<UpdateDocument>(request), actor(request))),
  );

  /** Static segment registered before `/:id` so it is not read as a document id. */
  fastify.get(
    '/:id/acknowledgements',
    { preHandler: read, schema: { params: documentsIdParamsSchema, querystring: DocumentsListQuerySchema } },
    async (request) =>
      inTenant(request, () => documents().listAcknowledgements(id(request), requestQuery<DocumentsListQuery>(request))),
  );

  fastify.post(
    '/:id/acknowledge',
    { preHandler: self, schema: { params: documentsIdParamsSchema, body: AcknowledgeDocumentSchema } },
    async (request) =>
      inTenant(request, () =>
        documents().acknowledge(id(request), actor(request), request, requestBody<AcknowledgeDocument>(request)),
      ),
  );
};
