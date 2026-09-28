import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CreateAcknowledgementSchema,
  ListAcknowledgementsQuerySchema,
  RevokeAcknowledgementSchema,
  acknowledgementsIdParamsSchema,
  type CreateAcknowledgement,
  type ListAcknowledgements,
  type RevokeAcknowledgement,
  type acknowledgementsIdParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { acknowledgementsPermissions } from './permissions';

/** Mounted at `/v1/acknowledgements`. */
export const AcknowledgementsRoutes: FastifyPluginAsync = async (fastify) => {
  const acknowledgements = () => fastify.container.acknowledgements;
  const self = composeGuards(requireAuth);
  const read = composeGuards(requireAuth, requirePermissions(acknowledgementsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(acknowledgementsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<acknowledgementsIdParams>(request).id;

  /* ---------------------------------------------------------------------- */
  /* Self service — the requester can only ever see their own trail          */
  /* ---------------------------------------------------------------------- */

  fastify.get('/mine', { preHandler: self, schema: { querystring: ListAcknowledgementsQuerySchema } }, async (request) =>
    acknowledgements().listMine(request.user?.id as string, requestQuery<ListAcknowledgements>(request)),
  );

  fastify.post('/', { preHandler: self, schema: { body: CreateAcknowledgementSchema } }, async (request) =>
    acknowledgements().acknowledge(request.user?.id as string, requestBody<CreateAcknowledgement>(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Oversight                                                               */
  /* ---------------------------------------------------------------------- */

  fastify.get('/', { preHandler: read, schema: { querystring: ListAcknowledgementsQuerySchema } }, async (request) =>
    acknowledgements().listAll(requestQuery<ListAcknowledgements>(request)),
  );

  fastify.get('/:id', { preHandler: read, schema: { params: acknowledgementsIdParamsSchema } }, async (request) =>
    acknowledgements().getById(id(request)),
  );

  fastify.post(
    '/:id/revoke',
    { preHandler: write, schema: { params: acknowledgementsIdParamsSchema, body: RevokeAcknowledgementSchema } },
    async (request) => acknowledgements().revoke(id(request), requestBody<RevokeAcknowledgement>(request)),
  );
};
