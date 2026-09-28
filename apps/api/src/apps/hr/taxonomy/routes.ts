import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CreateTaxonomySchema,
  EntityTagsParamsSchema,
  ReplaceEntityTagsSchema,
  SuggestTagTermsQuerySchema,
  SyncTaxonomyTermsSchema,
  TaxonomyFieldParamsSchema,
  TaxonomyKeyParamsSchema,
  TaxonomyListQuerySchema,
  UpdateFieldOptionsSchema,
  UpdateTaxonomySchema,
  UpsertTagTermSchema,
  taxonomyIdParamsSchema,
  type CreateTaxonomy,
  type EntityTagsParams,
  type ReplaceEntityTags,
  type SuggestTagTermsQuery,
  type SyncTaxonomyTerms,
  type TaxonomyFieldParams,
  type TaxonomyKeyParams,
  type TaxonomyListQuery,
  type UpdateFieldOptions,
  type UpdateTaxonomy,
  type UpsertTagTerm,
  type taxonomyIdParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { taxonomyPermissions } from './permissions';

/** Mounted at `/v1/taxonomy`. */
export const TaxonomyRoutes: FastifyPluginAsync = async (fastify) => {
  const taxonomy = () => fastify.container.taxonomy;
  const read = composeGuards(requireAuth, requirePermissions(taxonomyPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(taxonomyPermissions.write));
  const id = (request: FastifyRequest) => requestParams<taxonomyIdParams>(request).id;
  const key = (request: FastifyRequest) => requestParams<TaxonomyKeyParams>(request).taxonomyKey;
  const entity = (request: FastifyRequest) => requestParams<EntityTagsParams>(request);

  /* ---------------------------------------------------------------------- */
  /* Taxonomy definitions                                                    */
  /* ---------------------------------------------------------------------- */

  fastify.get('/', { preHandler: read, schema: { querystring: TaxonomyListQuerySchema } }, async (request) =>
    taxonomy().listTaxonomies(requestQuery<TaxonomyListQuery>(request)),
  );

  /**
   * The picker view: every taxonomy that has at least one selectable term,
   * including the request and form-field taxonomies, not just the tag ones.
   */
  fastify.get('/options', { preHandler: read, schema: { querystring: TaxonomyListQuerySchema } }, async (request) =>
    taxonomy().list(requestQuery<TaxonomyListQuery>(request)),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreateTaxonomySchema } }, async (request) =>
    taxonomy().createTaxonomy(requestBody<CreateTaxonomy>(request)),
  );

  fastify.put('/:id', { preHandler: write, schema: { params: taxonomyIdParamsSchema, body: UpdateTaxonomySchema } }, async (request) =>
    taxonomy().updateTaxonomy(id(request), requestBody<UpdateTaxonomy>(request)),
  );

  fastify.delete('/:id', { preHandler: write, schema: { params: taxonomyIdParamsSchema } }, async (request) =>
    taxonomy().deleteTaxonomy(id(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Terms — addressed by taxonomy key, not id                               */
  /* ---------------------------------------------------------------------- */

  fastify.post('/:taxonomyKey/terms/sync', { preHandler: write, schema: { params: TaxonomyKeyParamsSchema, body: SyncTaxonomyTermsSchema } }, async (request) =>
    taxonomy().syncTerms(key(request), requestBody<SyncTaxonomyTerms>(request)),
  );

  fastify.post('/:taxonomyKey/terms', { preHandler: write, schema: { params: TaxonomyKeyParamsSchema, body: UpsertTagTermSchema } }, async (request) =>
    taxonomy().upsertTagTerm(key(request), requestBody<UpsertTagTerm>(request)),
  );

  fastify.get(
    '/:taxonomyKey/terms/suggest',
    { preHandler: read, schema: { params: TaxonomyKeyParamsSchema, querystring: SuggestTagTermsQuerySchema } },
    async (request) => taxonomy().suggestTagTerms(key(request), requestQuery<SuggestTagTermsQuery>(request).query),
  );

  /* ---------------------------------------------------------------------- */
  /* Field option sets                                                       */
  /* ---------------------------------------------------------------------- */

  fastify.put(
    '/fields/:fieldId/options',
    { preHandler: write, schema: { params: TaxonomyFieldParamsSchema, body: UpdateFieldOptionsSchema } },
    async (request) =>
      taxonomy().updateFieldOptions(
        requestParams<TaxonomyFieldParams>(request).fieldId,
        requestBody<UpdateFieldOptions>(request),
      ),
  );

  /* ---------------------------------------------------------------------- */
  /* Entity tags — full replacement, not a merge                             */
  /* ---------------------------------------------------------------------- */

  fastify.get(
    '/entities/:entityType/:entityId/tags/:taxonomyKey',
    { preHandler: read, schema: { params: EntityTagsParamsSchema } },
    async (request) => {
      const { entityType, entityId, taxonomyKey } = entity(request);
      return taxonomy().listEntityTags(entityType, entityId, taxonomyKey);
    },
  );

  fastify.put(
    '/entities/:entityType/:entityId/tags/:taxonomyKey',
    { preHandler: write, schema: { params: EntityTagsParamsSchema, body: ReplaceEntityTagsSchema } },
    async (request) => {
      const { entityType, entityId, taxonomyKey } = entity(request);
      return taxonomy().replaceEntityTags(entityType, entityId, taxonomyKey, requestBody<ReplaceEntityTags>(request));
    },
  );
};
