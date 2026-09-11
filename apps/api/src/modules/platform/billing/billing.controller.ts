import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { CurrentTenant, TenantContext } from '$common/auth/tenant-context';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import { BillingService } from './billing.service';

@Controller('platform/billing')
@ApiTags('Platform Billing')
@ApiBearerAuth('bearer')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  listPlans() {
    return this.billing.listPlans();
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  current(@CurrentTenant() tenant: TenantContext) {
    return this.billing.getCurrent(tenant);
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  change(@CurrentTenant() tenant: TenantContext, @Body() dto: ChangeSubscriptionDto) {
    return this.billing.changePlan(tenant, dto);
  }

  @Delete('subscription')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentTenant() tenant: TenantContext) {
    return this.billing.cancel(tenant);
  }
}
