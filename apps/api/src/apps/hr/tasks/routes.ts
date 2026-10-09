import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AddWorkItemAttachmentSchema,
  CreateWorkItemCommentSchema,
  TasksIdParamsSchema,
  TasksListQuerySchema,
  UpsertSprintSchema,
  UpsertTeamGoalSchema,
  UpsertTeamKpiSchema,
  UpsertTeamObjectiveSchema,
  UpsertWorkItemSchema,
  UpsertWorkLogSchema,
  WorkItemAttachmentParamsSchema,
  WorkItemParamsSchema,
  type AddWorkItemAttachment,
  type CreateWorkItemComment,
  type TasksIdParams,
  type TasksListQuery,
  type UpsertSprint,
  type UpsertTeamGoal,
  type UpsertTeamKpi,
  type UpsertTeamObjective,
  type UpsertWorkItem,
  type UpsertWorkLog,
  type WorkItemAttachmentParams,
  type WorkItemParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { tasksPermissions } from './permissions';

/**
 * Mounted at `/v1/tasks`.
 *
 * Owns the work item board plus everything hanging off it: sprints, team OKRs,
 * comments and mentions, attachments, and the daily logs staff key their time
 * against. Timesheet entries live at `/v1/timesheets`; project metadata and
 * membership live at `/v1/projects`.
 *
 * Routes mirror `apps/shared/src/api/work-api.ts`: `/items/:id` accepts POST
 * for both create and update so the client can upsert with one method.
 */
export const TasksRoutes: FastifyPluginAsync = async (fastify) => {
  const tasks = () => fastify.container.tasks;
  const read = composeGuards(requireAuth, requirePermissions(tasksPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(tasksPermissions.write));
  const id = (request: FastifyRequest) => requestParams<TasksIdParams>(request).id;
  const itemId = (request: FastifyRequest) => requestParams<WorkItemParams>(request).id;
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  /* -------------------------------------------------------------------- */
  /* Work items                                                            */
  /* -------------------------------------------------------------------- */

  fastify.get('/my/items', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listMyItems(actor(request), requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/team/items', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listTeamItems(actor(request), requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/items/:id', { preHandler: read, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().getItem(actor(request), itemId(request)),
  );

  fastify.post('/items', { preHandler: write, schema: { body: UpsertWorkItemSchema } }, async (request) =>
    tasks().upsertItem(actor(request), requestBody<UpsertWorkItem>(request)),
  );

  fastify.post(
    '/items/:id',
    { preHandler: write, schema: { params: WorkItemParamsSchema, body: UpsertWorkItemSchema } },
    async (request) => tasks().upsertItem(actor(request), requestBody<UpsertWorkItem>(request), itemId(request)),
  );

  fastify.delete('/items/:id', { preHandler: write, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().deleteItem(actor(request), itemId(request)),
  );

  fastify.get('/board', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().board(actor(request), requestQuery<TasksListQuery>(request)),
  );

  /* -------------------------------------------------------------------- */
  /* Comments, mentions and attachments                                    */
  /* -------------------------------------------------------------------- */

  fastify.get('/items/:id/comments', { preHandler: read, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().listComments(actor(request), itemId(request)),
  );

  fastify.post(
    '/items/:id/comments',
    { preHandler: write, schema: { params: WorkItemParamsSchema, body: CreateWorkItemCommentSchema } },
    async (request) => tasks().addComment(actor(request), itemId(request), requestBody<CreateWorkItemComment>(request)),
  );

  fastify.get('/items/:id/attachments', { preHandler: read, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().listAttachments(actor(request), itemId(request)),
  );

  fastify.post(
    '/items/:id/attachments',
    { preHandler: write, schema: { params: WorkItemParamsSchema, body: AddWorkItemAttachmentSchema } },
    async (request) => tasks().addAttachment(actor(request), itemId(request), requestBody<AddWorkItemAttachment>(request)),
  );

  fastify.delete(
    '/items/:id/attachments/:attachmentId',
    { preHandler: write, schema: { params: WorkItemAttachmentParamsSchema } },
    async (request) => tasks().removeAttachment(
      actor(request),
      requestParams<WorkItemAttachmentParams>(request).id,
      requestParams<WorkItemAttachmentParams>(request).attachmentId,
    ),
  );

  /* -------------------------------------------------------------------- */
  /* Work logs                                                             */
  /* -------------------------------------------------------------------- */

  fastify.get('/my/logs', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listMyLogs(actor(request), requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/team/logs', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listTeamLogs(actor(request), requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/logs/:id', { preHandler: read, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().getLog(actor(request), id(request)),
  );

  fastify.post('/logs', { preHandler: write, schema: { body: UpsertWorkLogSchema } }, async (request) =>
    tasks().upsertLog(actor(request), requestBody<UpsertWorkLog>(request)),
  );

  fastify.post(
    '/logs/:id',
    { preHandler: write, schema: { params: WorkItemParamsSchema, body: UpsertWorkLogSchema } },
    async (request) => tasks().upsertLog(actor(request), requestBody<UpsertWorkLog>(request), id(request)),
  );

  fastify.post('/logs/:id/submit', { preHandler: write, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().submitLog(actor(request), id(request)),
  );

  fastify.post('/logs/:id/approve', { preHandler: write, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().approveLog(actor(request), id(request), true),
  );

  fastify.post('/logs/:id/reject', { preHandler: write, schema: { params: WorkItemParamsSchema } }, async (request) =>
    tasks().approveLog(actor(request), id(request), false),
  );

  /* -------------------------------------------------------------------- */
  /* Sprints                                                               */
  /* -------------------------------------------------------------------- */

  fastify.get('/sprints', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listSprints(requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/sprints/:id', { preHandler: read, schema: { params: TasksIdParamsSchema } }, async (request) =>
    tasks().getSprint(id(request)),
  );

  fastify.post('/sprints', { preHandler: write, schema: { body: UpsertSprintSchema } }, async (request) =>
    tasks().upsertSprint(actor(request), requestBody<UpsertSprint>(request)),
  );

  fastify.post(
    '/sprints/:id',
    { preHandler: write, schema: { params: TasksIdParamsSchema, body: UpsertSprintSchema } },
    async (request) => tasks().upsertSprint(actor(request), requestBody<UpsertSprint>(request), id(request)),
  );

  fastify.post('/sprints/:id/start', { preHandler: write, schema: { params: TasksIdParamsSchema } }, async (request) =>
    tasks().startSprint(actor(request), id(request)),
  );

  fastify.post('/sprints/:id/complete', { preHandler: write, schema: { params: TasksIdParamsSchema } }, async (request) =>
    tasks().completeSprint(actor(request), id(request)),
  );

  /* -------------------------------------------------------------------- */
  /* Team OKR                                                              */
  /* -------------------------------------------------------------------- */

  fastify.get('/goals', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listGoals(requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/goals/:id', { preHandler: read, schema: { params: TasksIdParamsSchema } }, async (request) =>
    tasks().getGoal(actor(request), id(request)),
  );

  fastify.post('/goals', { preHandler: write, schema: { body: UpsertTeamGoalSchema } }, async (request) =>
    tasks().upsertGoal(actor(request), requestBody<UpsertTeamGoal>(request)),
  );

  fastify.post(
    '/goals/:id',
    { preHandler: write, schema: { params: TasksIdParamsSchema, body: UpsertTeamGoalSchema } },
    async (request) => tasks().upsertGoal(actor(request), requestBody<UpsertTeamGoal>(request), id(request)),
  );

  fastify.get('/objectives', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listObjectives(requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/objectives/:id', { preHandler: read, schema: { params: TasksIdParamsSchema } }, async (request) =>
    tasks().getObjective(actor(request), id(request)),
  );

  fastify.post('/objectives', { preHandler: write, schema: { body: UpsertTeamObjectiveSchema } }, async (request) =>
    tasks().upsertObjective(actor(request), requestBody<UpsertTeamObjective>(request)),
  );

  fastify.post(
    '/objectives/:id',
    { preHandler: write, schema: { params: TasksIdParamsSchema, body: UpsertTeamObjectiveSchema } },
    async (request) => tasks().upsertObjective(actor(request), requestBody<UpsertTeamObjective>(request), id(request)),
  );

  fastify.get('/kpis', { preHandler: read, schema: { querystring: TasksListQuerySchema } }, async (request) =>
    tasks().listKpis(requestQuery<TasksListQuery>(request)),
  );

  fastify.get('/kpis/:id', { preHandler: read, schema: { params: TasksIdParamsSchema } }, async (request) =>
    tasks().getKpi(actor(request), id(request)),
  );

  fastify.post('/kpis', { preHandler: write, schema: { body: UpsertTeamKpiSchema } }, async (request) =>
    tasks().upsertKpi(actor(request), requestBody<UpsertTeamKpi>(request)),
  );

  fastify.post(
    '/kpis/:id',
    { preHandler: write, schema: { params: TasksIdParamsSchema, body: UpsertTeamKpiSchema } },
    async (request) => tasks().upsertKpi(actor(request), requestBody<UpsertTeamKpi>(request), id(request)),
  );
};
