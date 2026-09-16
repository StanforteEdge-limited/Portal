import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { LeaveService } from './leave.service';

@Controller('hr/leave')
@UseGuards(JwtAuthGuard)
@ApiTags('HR Leave')
@ApiBearerAuth('bearer')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get('types')
  types(@CurrentTenant() tenant: TenantContext) {
    return this.leave.listTypes(tenant);
  }

  @Post('types')
  createType(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateLeaveTypeDto) {
    return this.leave.createType(tenant, dto);
  }

  @Get('mine')
  mine(@CurrentTenant() tenant: TenantContext, @Query('status') status?: string) {
    return this.leave.listMine(tenant, status);
  }

  @Post('requests')
  request(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateLeaveRequestDto) {
    return this.leave.createRequest(tenant, dto);
  }

  @Get('requests')
  reviewQueue(@CurrentTenant() tenant: TenantContext, @Query('status') status?: string) {
    return this.leave.listForReview(tenant, status);
  }

  @Post('requests/:id/review')
  review(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: ReviewLeaveRequestDto) {
    return this.leave.review(tenant, id, dto);
  }

  @Get('balance')
  balance(@CurrentTenant() tenant: TenantContext, @Query('leave_type_id') leaveTypeId?: string, @Query('year') year?: string) {
    return this.leave.balance(tenant, leaveTypeId, year ? Number(year) : undefined);
  }
}
