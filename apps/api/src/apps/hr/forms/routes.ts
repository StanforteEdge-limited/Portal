import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CreateFormAssignmentSchema,
  CreateFormFieldSchema,
  CreateFormSchema,
  FormFieldParamsSchema,
  FormsListQuerySchema,
  UpdateFormFieldSchema,
  UpdateFormSchema,
  formsIdParamsSchema,
  type CreateForm,
  type CreateFormAssignment,
  type CreateFormField,
  type FormFieldParams,
  type FormsListQuery,
  type UpdateForm,
  type UpdateFormField,
  type formsIdParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { formsPermissions } from './permissions';

/** Mounted at `/v1/forms`. */
export const FormsRoutes: FastifyPluginAsync = async (fastify) => {
  const forms = () => fastify.container.forms;
  const self = composeGuards(requireAuth);
  const read = composeGuards(requireAuth, requirePermissions(formsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(formsPermissions.write));
  const formId = (request: FastifyRequest) => requestParams<formsIdParams>(request).id;
  const fieldId = (request: FastifyRequest) => requestParams<FormFieldParams>(request).fieldId;
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  /* ---------------------------------------------------------------------- */
  /* Definition — management surface                                         */
  /* ---------------------------------------------------------------------- */

  // `listForManagement` includes inactive forms, so it is kept on a separate
  // path from the user-facing `list`.
  fastify.get('/management', { preHandler: read, schema: { querystring: FormsListQuerySchema } }, async (request) =>
    forms().listForManagement(requestQuery<FormsListQuery>(request)),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreateFormSchema } }, async (request) =>
    forms().createForm(actor(request), requestBody<CreateForm>(request)),
  );

  fastify.put('/:id', { preHandler: write, schema: { params: formsIdParamsSchema, body: UpdateFormSchema } }, async (request) =>
    forms().updateForm(formId(request), requestBody<UpdateForm>(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Fields                                                                   */
  /* ---------------------------------------------------------------------- */

  fastify.post('/:id/fields', { preHandler: write, schema: { params: formsIdParamsSchema, body: CreateFormFieldSchema } }, async (request) =>
    forms().createField(formId(request), requestBody<CreateFormField>(request)),
  );

  fastify.put(
    '/:id/fields/:fieldId',
    { preHandler: write, schema: { params: FormFieldParamsSchema, body: UpdateFormFieldSchema } },
    async (request) => forms().updateField(formId(request), fieldId(request), requestBody<UpdateFormField>(request)),
  );

  fastify.delete('/:id/fields/:fieldId', { preHandler: write, schema: { params: FormFieldParamsSchema } }, async (request) =>
    forms().deleteField(formId(request), fieldId(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Assignments                                                              */
  /* ---------------------------------------------------------------------- */

  fastify.get('/assignments', { preHandler: read, schema: { querystring: FormsListQuerySchema } }, async (request) =>
    forms().listAssignments(requestQuery<FormsListQuery>(request)),
  );

  fastify.post('/assignments', { preHandler: write, schema: { body: CreateFormAssignmentSchema } }, async (request) =>
    forms().createAssignment(requestBody<CreateFormAssignment>(request)),
  );

  fastify.delete('/assignments/:id', { preHandler: write, schema: { params: formsIdParamsSchema } }, async (request) =>
    forms().deleteAssignment(formId(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* User-facing view                                                         */
  /* ---------------------------------------------------------------------- */

  fastify.get('/', { preHandler: self, schema: { querystring: FormsListQuerySchema } }, async (request) =>
    forms().list(requestQuery<FormsListQuery>(request)),
  );

  fastify.get('/:id', { preHandler: self, schema: { params: formsIdParamsSchema } }, async (request) =>
    forms().getFormById(formId(request)),
  );
};
