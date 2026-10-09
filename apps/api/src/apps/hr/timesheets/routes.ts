import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  TimesheetIdParamsSchema,
  TimesheetListQuerySchema,
  TimesheetSummaryQuerySchema,
  UpsertTimesheetEntrySchema,
  type TimesheetIdParams,
  type TimesheetListQuery,
  type TimesheetSummaryQuery,
  type UpsertTimesheetEntry,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { timesheetsPermissions } from './permissions';

/**
 * Mounted at `/v1/timesheets`.
 *
 * Self-service entry under `/my` only needs authentication — a worker keys up
 * their own hours and submits them. The `/entries` routes are the HR review
 * queue, and the approvals there are what feed the payroll run.
 */
export const TimesheetRoutes: FastifyPluginAsync = async (fastify) => {
  const timesheets = () => fastify.container.timesheets;
  const tasks = () => fastify.container.tasks;
  const read = composeGuards(requireAuth, requirePermissions(timesheetsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(timesheetsPermissions.write));
  const authenticated = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const id = (request: FastifyRequest) => requestParams<TimesheetIdParams>(request).id;

  /* -------------------------------------------------------------------- */
  /* Self service                                                          */
  /* -------------------------------------------------------------------- */

  // The rollup is derived from the caller's work logs, which the tasks module
  // owns, so the aggregation stays there and this route just re-exposes it.
  fastify.get('/my/summary', { preHandler: authenticated, schema: { querystring: TimesheetSummaryQuerySchema } }, async (request) =>
    tasks().myTimesheetSummary(actor(request), requestQuery<TimesheetSummaryQuery>(request)),
  );

  fastify.get('/my/entries', { preHandler: authenticated, schema: { querystring: TimesheetListQuerySchema } }, async (request) =>
    timesheets().listMyEntries(actor(request), requestQuery<TimesheetListQuery>(request)),
  );

  fastify.post('/my/entries', { preHandler: authenticated, schema: { body: UpsertTimesheetEntrySchema } }, async (request) =>
    timesheets().createMyEntry(actor(request), requestBody<UpsertTimesheetEntry>(request)),
  );

  fastify.post(
    '/my/entries/:id',
    { preHandler: authenticated, schema: { params: TimesheetIdParamsSchema, body: UpsertTimesheetEntrySchema } },
    async (request) => timesheets().updateMyEntry(actor(request), id(request), requestBody<UpsertTimesheetEntry>(request)),
  );

  fastify.post('/my/entries/:id/submit', { preHandler: authenticated, schema: { params: TimesheetIdParamsSchema } }, async (request) =>
    timesheets().submitMyEntry(actor(request), id(request)),
  );

  /* -------------------------------------------------------------------- */
  /* HR review queue                                                       */
  /* -------------------------------------------------------------------- */

  fastify.get('/entries', { preHandler: read, schema: { querystring: TimesheetListQuerySchema } }, async (request) =>
    timesheets().listEntries(requestQuery<TimesheetListQuery>(request)),
  );

  fastify.post('/entries', { preHandler: write, schema: { body: UpsertTimesheetEntrySchema } }, async (request) =>
    timesheets().createEntry(requestBody<UpsertTimesheetEntry>(request), actor(request)),
  );

  fastify.post(
    '/entries/:id',
    { preHandler: write, schema: { params: TimesheetIdParamsSchema, body: UpsertTimesheetEntrySchema } },
    async (request) => timesheets().updateEntry(id(request), requestBody<UpsertTimesheetEntry>(request), actor(request)),
  );

  fastify.post('/entries/:id/submit', { preHandler: write, schema: { params: TimesheetIdParamsSchema } }, async (request) =>
    timesheets().submitEntry(id(request)),
  );

  fastify.post('/entries/:id/approve', { preHandler: write, schema: { params: TimesheetIdParamsSchema } }, async (request) =>
    timesheets().approveEntry(id(request), actor(request)),
  );

  fastify.post('/entries/:id/reject', { preHandler: write, schema: { params: TimesheetIdParamsSchema } }, async (request) =>
    timesheets().rejectEntry(id(request)),
  );
};
