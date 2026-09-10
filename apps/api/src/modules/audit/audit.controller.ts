import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Audit')
@ApiBearerAuth('bearer')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('audit.view')
  list(@Query() query: Record<string, any>) {
    return this.auditService.listEvents(query);
  }

  @Get('requests/:requestId')
  @Permissions('audit.view')
  requestAudit(@Param('requestId') requestId: string) {
    return this.auditService.getRequestAudit(requestId);
  }

  @Get('email-logs')
  @Permissions('audit.view')
  emailLogs(@Query() query: Record<string, any>) {
    return this.auditService.listEmailLogs(query);
  }

  @Post()
  @Permissions('audit.manage')
  create(@Req() req: any, @Body() dto: CreateAuditEventDto) {
    return this.auditService.createEvent(dto, req.user?.id);
  }
}
