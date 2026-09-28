import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AcceptInviteSchema,
  AdjustLeaveBalanceSchema,
  AssignEmployeeOrganizationSchema,
  AssignEmployeeTeamSchema,
  AssignOnboardingFormSchema,
  EmployeeActionSchema,
  EmployeesIdParamsSchema,
  EmployeesListQuerySchema,
  SetPrimaryOrganizationSchema,
  UpdateOnboardingFormAssignmentSchema,
  UpsertEmployeeSchema,
  type AcceptInvite,
  type AdjustLeaveBalance,
  type AssignEmployeeOrganization,
  type AssignEmployeeTeam,
  type AssignOnboardingForm,
  type EmployeeAction,
  type EmployeesIdParams,
  type EmployeesListQuery,
  type SetPrimaryOrganization,
  type UpdateOnboardingFormAssignment,
  type UpsertEmployee,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { employeesPermissions } from './permissions';

/** Mounted at `/v1/employees`. */
export const EmployeesRoutes: FastifyPluginAsync = async (fastify) => {
  const employees = () => fastify.container.employees;
  const read = composeGuards(requireAuth, requirePermissions(employeesPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(employeesPermissions.write));
  const id = (request: FastifyRequest) => requestParams<EmployeesIdParams>(request).id;
  const pathId = (request: FastifyRequest, key: string) => requestParams<Record<string, string>>(request)[key];

  /* ---------------------------------------------------------------------- */
  /* Invitation acceptance — public, the invite token is the credential     */
  /* ---------------------------------------------------------------------- */

  fastify.post('/accept-invite', { schema: { body: AcceptInviteSchema } }, async (request) =>
    employees().acceptInvite(requestBody<AcceptInvite>(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Dashboard                                                              */
  /* ---------------------------------------------------------------------- */

  fastify.get('/summary', { preHandler: read }, async () => employees().summary());

  /* ---------------------------------------------------------------------- */
  /* Employees                                                              */
  /* ---------------------------------------------------------------------- */

  fastify.get('/', { preHandler: read, schema: { querystring: EmployeesListQuerySchema } }, async (request) =>
    employees().listEmployees(requestQuery<EmployeesListQuery>(request)),
  );

  fastify.post('/', { preHandler: write, schema: { body: UpsertEmployeeSchema } }, async (request) =>
    employees().createEmployee(requestBody<UpsertEmployee>(request)),
  );

  // Static segments are registered before `/:id` so they are never captured as
  // an employee id by the param route.
  fastify.get(
    '/onboarding-form-assignments',
    { preHandler: read, schema: { querystring: EmployeesListQuerySchema } },
    async (request) => employees().listOnboardingFormAssignments(requestQuery(request)),
  );

  fastify.post(
    '/onboarding-form-assignments',
    { preHandler: write, schema: { body: AssignOnboardingFormSchema } },
    async (request) => employees().assignOnboardingForm(requestBody<AssignOnboardingForm>(request)),
  );

  fastify.get('/leave-balances', { preHandler: read }, async (request) =>
    employees().getLeaveBalance(requestQuery(request)),
  );

  fastify.post(
    '/leave-balances/adjust',
    { preHandler: write, schema: { body: AdjustLeaveBalanceSchema } },
    async (request) =>
      employees().adjustLeaveBalance(requestBody<AdjustLeaveBalance>(request), request.user?.id as string),
  );

  fastify.get(
    '/:id',
    { preHandler: read, schema: { params: EmployeesIdParamsSchema } },
    async (request) => employees().getEmployee(id(request)),
  );

  fastify.put(
    '/:id',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema, body: UpsertEmployeeSchema } },
    async (request) => employees().updateEmployee(id(request), requestBody<UpsertEmployee>(request)),
  );

  fastify.patch(
    '/:id',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema, body: UpsertEmployeeSchema } },
    async (request) => employees().updateEmployee(id(request), requestBody<UpsertEmployee>(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Lifecycle actions                                                      */
  /* ---------------------------------------------------------------------- */

  // There is no DELETE /:id on purpose: an employee record is exited through
  // the lifecycle action so employment history is preserved.
  fastify.post(
    '/:id/actions',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema, body: EmployeeActionSchema } },
    async (request) => employees().runEmployeeAction(id(request), requestBody<EmployeeAction>(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Organization membership                                                */
  /* ---------------------------------------------------------------------- */

  fastify.post(
    '/:id/primary-organization',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema, body: SetPrimaryOrganizationSchema } },
    async (request) => employees().setPrimaryOrganization(id(request), requestBody<SetPrimaryOrganization>(request)),
  );

  fastify.post(
    '/:id/organizations',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema, body: AssignEmployeeOrganizationSchema } },
    async (request) =>
      employees().addOrganizationMembership(id(request), requestBody<AssignEmployeeOrganization>(request)),
  );

  fastify.delete(
    '/:id/organizations/:organizationId',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema } },
    async (request) => employees().removeOrganizationMembership(id(request), pathId(request, 'organizationId')),
  );

  /* ---------------------------------------------------------------------- */
  /* Team membership                                                        */
  /* ---------------------------------------------------------------------- */

  fastify.post(
    '/:id/teams',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema, body: AssignEmployeeTeamSchema } },
    async (request) => employees().addTeamMembership(id(request), requestBody<AssignEmployeeTeam>(request)),
  );

  fastify.delete(
    '/:id/teams/:teamId',
    { preHandler: write, schema: { params: EmployeesIdParamsSchema } },
    async (request) => employees().removeTeamMembership(id(request), pathId(request, 'teamId')),
  );

  /* ---------------------------------------------------------------------- */
  /* Onboarding form assignments                                            */
  /* ---------------------------------------------------------------------- */

  fastify.patch(
    '/onboarding-form-assignments/:assignmentId',
    { preHandler: write, schema: { body: UpdateOnboardingFormAssignmentSchema } },
    async (request) =>
      employees().updateOnboardingFormAssignment(
        pathId(request, 'assignmentId'),
        requestBody<UpdateOnboardingFormAssignment>(request),
      ),
  );

  fastify.delete('/onboarding-form-assignments/:assignmentId', { preHandler: write }, async (request) =>
    employees().deleteOnboardingFormAssignment(pathId(request, 'assignmentId')),
  );
};
