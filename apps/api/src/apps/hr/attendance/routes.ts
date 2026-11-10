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
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
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

  fastify.get('/status', { preHandler: authenticated }, async (request) =>
    attendance().getAttendanceStatus(actor(request)),
  );

  fastify.get('/mine', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().myAttendance(actor(request), requestQuery<AttendanceListQuery>(request)),
  );

  fastify.get('/me', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().myAttendance(actor(request), requestQuery<AttendanceListQuery>(request)),
  );

  fastify.post('/clock-in', { preHandler: authenticated, schema: { body: ClockAttendanceSchema } }, async (request) =>
    attendance().clockIn(actor(request), request, requestBody<ClockAttendance>(request)),
  );

  fastify.post('/clock-out', { preHandler: authenticated, schema: { body: ClockAttendanceSchema } }, async (request) =>
    attendance().clockOut(actor(request), request, requestBody<ClockAttendance>(request)),
  );

  fastify.get('/records', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().records(requestQuery<AttendanceListQuery>(request)),
  );

  fastify.get('/summary', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().summary(requestQuery<AttendanceListQuery>(request)),
  );

  fastify.get('/daily/:id', { preHandler: read, schema: { params: attendanceIdParamsSchema, querystring: AttendanceListQuerySchema } }, async (request) => {
    const query = requestQuery<AttendanceListQuery>(request);
    return attendance().getDailyRecord(id(request), String(query.from ?? query.to ?? new Date().toISOString().slice(0, 10)));
  });

  fastify.get('/office-locations', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().listOfficeLocations(requestQuery<AttendanceListQuery>(request)),
  );

  fastify.post('/office-locations', { preHandler: write, schema: { body: UpsertOfficeLocationSchema } }, async (request) =>
    attendance().createOfficeLocation(actor(request), requestBody<UpsertOfficeLocation>(request)),
  );

  fastify.put('/office-locations/:id', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: UpsertOfficeLocationSchema } }, async (request) =>
    attendance().updateOfficeLocation(actor(request), id(request), requestBody<UpsertOfficeLocation>(request)),
  );

  fastify.get('/corrections', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().listCorrections(actor(request), requestQuery<AttendanceListQuery>(request)),
  );

  fastify.post('/corrections', { preHandler: authenticated, schema: { body: CreateAttendanceCorrectionSchema } }, async (request) =>
    attendance().createCorrection(actor(request), requestBody<CreateAttendanceCorrection>(request)),
  );

  fastify.post('/corrections/:id/approve', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: ReviewAttendanceCorrectionSchema } }, async (request) =>
    attendance().approveCorrection(actor(request), id(request), requestBody<ReviewAttendanceCorrection>(request)),
  );

  fastify.post('/corrections/:id/reject', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: ReviewAttendanceCorrectionSchema } }, async (request) =>
    attendance().rejectCorrection(actor(request), id(request), requestBody<ReviewAttendanceCorrection>(request)),
  );

  fastify.get('/exceptions', { preHandler: read, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().listExceptions(requestQuery<AttendanceListQuery>(request)),
  );

  fastify.post('/exceptions', { preHandler: write, schema: { body: CreateAttendanceExceptionSchema } }, async (request) =>
    attendance().createException(actor(request), requestBody<CreateAttendanceException>(request)),
  );

  fastify.post('/exceptions/:id/resolve', { preHandler: write, schema: { params: attendanceIdParamsSchema, body: ReviewAttendanceExceptionSchema } }, async (request) =>
    attendance().resolveException(actor(request), id(request), requestBody<ReviewAttendanceException>(request)),
  );

  fastify.get('/', { preHandler: authenticated, schema: { querystring: AttendanceListQuerySchema } }, async (request) =>
    attendance().myAttendance(actor(request), requestQuery<AttendanceListQuery>(request)),
  );
};
