import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { SetPrimaryOrganizationDto } from './dto/set-primary-organization.dto';
import { HrService } from './hr.service';
import { EmployeeActionDto, UpsertEmployeeDto } from './dto/upsert-employee.dto';
import { AdjustLeaveBalanceDto } from './dto/leave-balance.dto';
import {
  AssignEmployeeOrganizationDto,
  AssignEmployeeTeamDto,
  AssignOnboardingFormDto,
  UpdateOnboardingFormAssignmentDto
} from './dto/manage-employee-links.dto';
import { PoliciesService } from '../policies/policies.service';
import { CreatePolicyDto } from '../policies/dto/create-policy.dto';
import { UpdatePolicyDto } from '../policies/dto/update-policy.dto';
import { ResolvePolicyDto } from '../policies/dto/resolve-policy.dto';

const HR_POLICY_MODULES = ['hr', 'attendance', 'leave', 'work'];

@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('HR')
@ApiBearerAuth('bearer')
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly policiesService: PoliciesService
  ) {}

  @Get('summary')
  @Permissions('hr.view', 'hr.manage', 'hr.employees')
  summary() {
    return this.hrService.summary();
  }

  @Get('employees')
  @Permissions('hr.view', 'hr.manage', 'hr.employees')
  list(@Query() query: Record<string, any>) {
    return this.hrService.listEmployees(query);
  }

  @Post('employees')
  @Permissions('hr.manage')
  create(@Body() dto: UpsertEmployeeDto) {
    return this.hrService.createEmployee(dto);
  }

  @Get('employees/:id')
  @Permissions('hr.view', 'hr.manage', 'hr.employees')
  get(@Param('id') id: string) {
    return this.hrService.getEmployee(id);
  }

  @Patch('employees/:id')
  @Permissions('hr.manage', 'hr.employees')
  update(@Param('id') id: string, @Body() dto: UpsertEmployeeDto) {
    return this.hrService.updateEmployee(id, dto);
  }

  @Patch('employees/:id/action')
  @Permissions('hr.manage')
  runAction(@Param('id') id: string, @Body() dto: EmployeeActionDto) {
    return this.hrService.runEmployeeAction(id, dto);
  }

  @Post('employees/:id/organizations')
  @Permissions('hr.manage')
  addOrganization(@Param('id') id: string, @Body() dto: AssignEmployeeOrganizationDto) {
    return this.hrService.addOrganizationMembership(id, dto);
  }

  @Delete('employees/:id/organizations/:organizationId')
  @Permissions('hr.manage')
  removeOrganization(@Param('id') id: string, @Param('organizationId') organizationId: string) {
    return this.hrService.removeOrganizationMembership(id, organizationId);
  }

  @Post('employees/:id/teams')
  @Permissions('hr.manage')
  addTeam(@Param('id') id: string, @Body() dto: AssignEmployeeTeamDto) {
    return this.hrService.addTeamMembership(id, dto);
  }

  @Delete('employees/:id/teams/:teamId')
  @Permissions('hr.manage')
  removeTeam(@Param('id') id: string, @Param('teamId') teamId: string) {
    return this.hrService.removeTeamMembership(id, teamId);
  }

  @Post('employees/:id/primary-organization')
  @Permissions('hr.manage')
  setPrimaryOrganization(@Param('id') id: string, @Body() dto: SetPrimaryOrganizationDto) {
    return this.hrService.setPrimaryOrganization(id, dto);
  }

  @Get('onboarding/forms')
  @Permissions('hr.manage', 'hr.employees')
  listOnboardingFormAssignments(@Query() query: Record<string, any>) {
    return this.hrService.listOnboardingFormAssignments(query);
  }

  @Post('onboarding/forms/assign')
  @Permissions('hr.manage')
  assignOnboardingForm(@Body() dto: AssignOnboardingFormDto) {
    return this.hrService.assignOnboardingForm(dto);
  }

  @Delete('onboarding/forms/assignments/:id')
  @Permissions('hr.manage')
  deleteOnboardingFormAssignment(@Param('id') id: string) {
    return this.hrService.deleteOnboardingFormAssignment(id);
  }

  @Patch('onboarding/forms/assignments/:id')
  @Permissions('hr.manage')
  updateOnboardingFormAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateOnboardingFormAssignmentDto
  ) {
    return this.hrService.updateOnboardingFormAssignment(id, dto);
  }

  @Get('leave/balance')
  @Permissions('hr.manage', 'leave.manage', 'leave.view')
  leaveBalance(@Query() query: Record<string, any>) {
    return this.hrService.getLeaveBalance(query);
  }

  @Post('leave/balance/adjust')
  @Permissions('hr.manage', 'leave.manage')
  adjustLeaveBalance(@Req() req: any, @Body() dto: AdjustLeaveBalanceDto) {
    return this.hrService.adjustLeaveBalance(dto, req.user?.id);
  }

  @Get('policies')
  @Permissions('hr.view', 'hr.manage')
  listPolicies(@Query() query: Record<string, any>) {
    return this.policiesService.list({ ...query, modules: HR_POLICY_MODULES });
  }

  @Post('policies')
  @Permissions('hr.manage')
  createPolicy(@Req() req: any, @Body() dto: CreatePolicyDto) {
    return this.policiesService.create(dto, req.user?.id);
  }

  @Post('policies/resolve')
  @Permissions('hr.view', 'hr.manage')
  resolvePolicy(@Body() dto: ResolvePolicyDto) {
    return this.policiesService.resolve(dto);
  }

  @Post('policies/:id')
  @Permissions('hr.manage')
  updatePolicy(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.policiesService.update(id, dto, req.user?.id);
  }

  @Delete('policies/:id')
  @Permissions('hr.manage')
  deletePolicy(@Param('id') id: string) {
    return this.policiesService.delete(id);
  }
}
