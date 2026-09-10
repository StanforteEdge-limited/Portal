import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { WorkflowService } from './workflow.service';

@Controller('workflow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Workflow')
@ApiBearerAuth('bearer')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('start')
  @Permissions('workflow_manage')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', example: '1001' },
        request_type_id: { type: 'string', example: '9ba68e6d-4f02-4bf0-9bde-cdb6425db7b8' },
        total_amount: { type: 'number', example: 45000 }
      },
      required: ['entity_id', 'request_type_id']
    }
  })
  startWorkflow(@Req() req: any, @Body() body: any) {
    if (!body.entity_id || !body.request_type_id) {
      throw new BadRequestException('entity_id and request_type_id are required');
    }
    return this.workflowService.startForRequest({
      requestId: BigInt(body.entity_id),
      requestTypeId: body.request_type_id,
      initiatedBy: req.user.id,
      amount: body.total_amount
    });
  }

  @Post('transition/:instance_id')
  @Permissions('workflow_manage')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['approve', 'reject'], example: 'approve' },
        comment: { type: 'string', example: 'Looks good' }
      },
      required: ['action']
    }
  })
  processTransition(@Req() req: any, @Param('instance_id') instanceId: string, @Body() body: any) {
    if (body.action !== 'approve' && body.action !== 'reject') {
      throw new BadRequestException('action must be approve or reject');
    }
    return this.workflowService.processDecision({
      instanceId,
      action: body.action,
      comment: body.comment,
      performedBy: req.user.id
    });
  }

  @Get('actions/:instance_id')
  @Permissions('workflow_view')
  getAvailableActions(@Param('instance_id') instanceId: string) {
    return this.workflowService.getAvailableActions(instanceId);
  }

  @Get('history/:instance_id')
  @Permissions('workflow_view')
  getHistory(@Param('instance_id') instanceId: string) {
    return this.workflowService.getHistory(instanceId);
  }

  @Get('instance/:instance_id')
  @Permissions('workflow_view')
  getInstance(@Param('instance_id') instanceId: string) {
    return this.workflowService.getInstance(instanceId);
  }

  @Post('cancel/:instance_id')
  @Permissions('workflow_manage')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', example: 'Duplicate request' }
      }
    }
  })
  cancelWorkflow(@Req() req: any, @Param('instance_id') instanceId: string, @Body() body: any) {
    return this.workflowService.cancelWorkflow(instanceId, req.user.id, body?.reason);
  }
}
