import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AttendanceListQuerySchema,
  ClockAttendanceSchema,
  CreateAttendanceCorrectionSchema,
  CreateAttendanceExceptionSchema,
  ReviewAttendanceCorrectionSchema,
  ReviewAttendanceExceptionSchema,
  UpsertOfficeLocationSchema,
  attendanceIdParamsSchema,
  type AttendanceListQuery,
  type ClockAttendance,
  type CreateAttendanceCorrection,
  type CreateAttendanceException,
  type ReviewAttendanceCorrection,
  type ReviewAttendanceException,
  type UpsertOfficeLocation,
  type attendanceIdParams,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { attendancePermissions } from './permissions';

/** Mounted at `/v1/attendance`. */
export const AttendanceRoutes: FastifyPluginAsync = async (fastify) => {
  const attendance = () => fastify.container.attendance;
  const read = composeGuards(requireAuth, requirePermissions(attendancePermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(attendancePermissions.write));
  const authenticated = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const id = (request: FastifyRequest) => requestParams<attendanceIdParams>(request).id;
  const inTenant = <T>(request: FastifyRequest, op: () => Promise<T> | T) =>
    fastify.container.tenantContext.run(currentTenant(request), op);

  fastify.get('/status', { preHandler: authenticated }, async (request) =>
    inTenant(request, () => attendance().getAttendanceStatus(actor(request))),
  );

  fastify.get('/mine', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().myAttendance(actor(request), requestQuery<AttendanceListQuery>(request))),
  );

  fastify.get('/me', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().myAttendance(actor(request), requestQuery<AttendanceListQuery>(request))),
  );

  fastify.post('/clock-in', { preHandler: authenticated, schema: { body: ClockAttendanceSchema } }, async (request) => {
    const body = requestBody<ClockAttendance>(request);
    // Strip client-controlled source/at so staff cannot spoof source='import' or backdate timestamps
    return inTenant(request, () =>
      attendance().clockIn(actor(request), request, {
        ...body,
        source: 'web',
        at: undefined,
      }),
    );
  });

  fastify.post('/clock-out', { preHandler: authenticated, schema: { body: ClockAttendanceSchema } }, async (request) => {
    const body = requestBody<ClockAttendance>(request);
    return inTenant(request, () =>
      attendance().clockOut(actor(request), request, {
        ...body,
        source: 'web',
        at: undefined,
      }),
    );
  });

  fastify.get('/records', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().records(requestQuery<AttendanceListQuery>(request))),
  );

  fastify.get('/summary', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().summary(requestQuery<AttendanceListQuery>(request))),
  );

  fastify.get('/daily/:id', { preHandler: read, schema: { params: attendanceIdParamsSchema, querystring: AttendanceListQuerySchema } }, async (request) => {
    const query = requestQuery<AttendanceListQuery>(request);
    return inTenant(request, () =>
      attendance().getDailyRecord(id(request), String(query.from ?? query.to ?? new Date().toISOString().slice(0, 10))),
    );
  });

  fastify.get('/office-locations', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().listOfficeLocations(requestQuery<AttendanceListQuery>(request))),
  );

  fastify.post('/office-locations', { preHandler: write, schema: { body: UpsertOfficeLocationSchema } }, async (request) =>
    inTenant(request, () => attendance().createOfficeLocation(actor(request), requestBody<UpsertOfficeLocation>(request))),
  );

  fastify.put('/office-locations/:id', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: UpsertOfficeLocationSchema } }, async (request) =>
    inTenant(request, () => attendance().updateOfficeLocation(actor(request), id(request), requestBody<UpsertOfficeLocation>(request))),
  );

  fastify.get('/corrections', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().listCorrections(actor(request), requestQuery<AttendanceListQuery>(request))),
  );

  fastify.post('/corrections', { preHandler: authenticated, schema: { body: CreateAttendanceCorrectionSchema } }, async (request) =>
    inTenant(request, () => attendance().createCorrection(actor(request), requestBody<CreateAttendanceCorrection>(request))),
  );

  fastify.post('/corrections/:id/approve', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: ReviewAttendanceCorrectionSchema } }, async (request) =>
    inTenant(request, () => attendance().approveCorrection(actor(request), id(request), requestBody<ReviewAttendanceCorrection>(request))),
  );

  fastify.post('/corrections/:id/reject', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: ReviewAttendanceCorrectionSchema } }, async (request) =>
    inTenant(request, () => attendance().rejectCorrection(actor(request), id(request), requestBody<ReviewAttendanceCorrection>(request))),
  );

  fastify.get('/exceptions', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().listExceptions(requestQuery<AttendanceListQuery>(request))),
  );

  fastify.post('/exceptions', { preHandler: write, schema: { body: CreateAttendanceExceptionSchema } }, async (request) =>
    inTenant(request, () => attendance().createException(actor(request), requestBody<CreateAttendanceException>(request))),
  );

  fastify.post('/exceptions/:id/resolve', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: ReviewAttendanceExceptionSchema } }, async (request) =>
    inTenant(request, () => attendance().resolveException(actor(request), id(request), requestBody<ReviewAttendanceException>(request))),
  );

  fastify.get('/', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    inTenant(request, () => attendance().myAttendance(actor(request), requestQuery<AttendanceListQuery>(request))),
  );
};
