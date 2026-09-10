import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { SubmitRequestDto } from './dto/submit-request.dto';
import { ActionRequestDto } from './dto/action-request.dto';
import { RequestResponseDto } from './dto/request-response.dto';
import { RetireRequestDto } from './dto/retire-request.dto';
import { CreateManualRequestDto } from './dto/create-manual-request.dto';
import { UpdateManualRequestDto } from './dto/update-manual-request.dto';
import { DownloadRequestDto } from './dto/download-request.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';

@Controller('requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Requests')
@ApiBearerAuth('bearer')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('groups')
  @Permissions('requests.view')
  listGroups() {
    return this.requestsService.listGroups();
  }

  @Post('groups')
  @Permissions('requests.manage')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.requestsService.createGroup(dto);
  }

  @Post('groups/:id')
  @Permissions('requests.manage')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.requestsService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @Permissions('requests.manage')
  deleteGroup(@Param('id') id: string) {
    return this.requestsService.deleteGroup(id);
  }

  @Get('categories')
  @Permissions('requests.view')
  listCategories(@Query('group_id') groupId?: string) {
    return this.requestsService.listCategories(groupId);
  }

  @Post('categories')
  @Permissions('requests.manage')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.requestsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Permissions('requests.manage')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.requestsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Permissions('requests.manage')
  deleteCategory(@Param('id') id: string) {
    return this.requestsService.deleteCategory(id);
  }

  @Get('types')
  @Permissions('requests.view')
  listTypes(@Req() req: any, @Query('group_id') groupId?: string, @Query('category_id') categoryId?: string, @Query('include_inactive') includeInactive?: string) {
    return this.requestsService.listTypes(groupId, categoryId, includeInactive === 'true', this.currentUserId(req));
  }

  @Get('types/:id')
  @Permissions('requests.view')
  getType(@Param('id') id: string) {
    return this.requestsService.getType(id);
  }

  @Post('types')
  @Permissions('requests.manage')
  @ApiBody({
    type: CreateTypeDto,
    examples: {
      financeType: {
        value: {
          category_id: 'replace-category-id',
          name: 'Operational Request',
          code_prefix: 'OP',
          storage_type: 'json',
          approval_limit: 2000000,
          approval_flow_json: {
            steps: [
              { approver: { type: 'relation', value: 'requester_team_lead' } },
              { approver: { type: 'permission', value: 'finance.approve' } },
              { approver: { type: 'office', value: 'coo' }, min_amount: 500000 },
              { approver: { type: 'office', value: 'ed' }, min_amount: 2000000 }
            ]
          }
        }
      }
    }
  })
  createType(@Req() req: any, @Body() dto: CreateTypeDto) {
    return this.requestsService.createType(dto, this.currentUserId(req));
  }

  @Post('types/:id')
  @Permissions('requests.manage')
  @ApiBody({
    type: UpdateTypeDto,
    examples: {
      updateWorkflow: {
        value: {
          approval_flow_json: {
            steps: [
              { approver: { type: 'relation', value: 'requester_team_lead' } },
              { approver: { type: 'permission', value: 'finance.approve' } },
              { approver: { type: 'office', value: 'coo' }, min_amount: 300000 }
            ]
          }
        }
      }
    }
  })
  updateType(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTypeDto) {
    return this.requestsService.updateType(id, dto, this.currentUserId(req));
  }

  @Patch('types/:id')
  @Permissions('requests.manage')
  @ApiBody({
    type: UpdateTypeDto,
    examples: {
      updateWorkflow: {
        value: {
          approval_flow_json: {
            steps: [
              { approver: { type: 'relation', value: 'requester_team_lead' } },
              { approver: { type: 'permission', value: 'finance.approve' } },
              { approver: { type: 'office', value: 'coo' }, min_amount: 300000 }
            ]
          }
        }
      }
    }
  })
  patchType(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTypeDto) {
    return this.requestsService.updateType(id, dto, this.currentUserId(req));
  }

  @Delete('types/:id')
  @Permissions('requests.manage')
  deleteType(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.deleteType(id, this.currentUserId(req));
  }

  @Post()
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Create request draft with items' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBody({
    type: CreateRequestDto,
    examples: {
      pettyCashDraft: {
        value: {
          request_type_id: 'replace-with-pc-type-id',
          data: { purpose: 'Site logistics for week 7', reimbursement: false },
          currency: 'NGN',
          items: [
            {
              description: 'Diesel purchase',
              amount: 25000,
              quantity: 1,
              notes: 'Generator support',
              file_id: 'replace-with-file-id'
            }
          ]
        }
      }
    }
  })
  createRequest(@Req() req: any, @Body() dto: CreateRequestDto) {
    return this.requestsService.createRequest(req.user?.id, dto);
  }

  @Post(':id/submit')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Submit request for approval workflow' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBody({
    type: SubmitRequestDto,
    examples: {
      default: { value: { comment: 'Please review and approve urgently.' } }
    }
  })
  submitRequest(@Req() req: any, @Param('id') id: string, @Body() dto: SubmitRequestDto) {
    return this.requestsService.submitRequest(id, req.user?.id, dto);
  }

  @Post(':id/approve')
  @Permissions('requests.approve')
  @ApiOperation({ summary: 'Approve request at current workflow step' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBody({
    type: ActionRequestDto,
    examples: {
      default: { value: { action: 'approve', comment: 'Approved from finance desk' } }
    }
  })
  approveRequest(@Req() req: any, @Param('id') id: string, @Body() dto: ActionRequestDto) {
    return this.requestsService.approveRequest(id, req.user?.id, dto);
  }

  @Post(':id/reject')
  @Permissions('requests.approve')
  @ApiOperation({ summary: 'Reject request at current workflow step' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBody({
    type: ActionRequestDto,
    examples: {
      default: { value: { action: 'reject', comment: 'Insufficient documentation attached' } }
    }
  })
  rejectRequest(@Req() req: any, @Param('id') id: string, @Body() dto: ActionRequestDto) {
    return this.requestsService.rejectRequest(id, req.user?.id, dto);
  }

  @Post(':id/return')
  @Permissions('requests.approve')
  @ApiOperation({ summary: 'Return request to requester for edit before finance clearance' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBody({
    type: ActionRequestDto,
    examples: {
      default: { value: { action: 'return', comment: 'Please update the amount and attach invoice support.' } }
    }
  })
  returnRequest(@Req() req: any, @Param('id') id: string, @Body() dto: ActionRequestDto) {
    return this.requestsService.returnRequest(id, req.user?.id, dto);
  }

  @Get()
  @Permissions('requests.view')
  @ApiOkResponse({ type: RequestResponseDto, isArray: true })
  listRequests(@Req() req: any, @Query() query: Record<string, any>) {
    return this.requestsService.listRequests(query, req.user?.id);
  }

  @Get('approvals')
  @Permissions('requests.approve')
  @ApiOkResponse({ type: RequestResponseDto, isArray: true })
  getApprovals(@Req() req: any, @Query() query: Record<string, any>) {
    return this.requestsService.getApprovals(req.user?.id, query);
  }

  @Get('leave/balance')
  @Permissions('requests.view')
  getMyLeaveBalance(@Req() req: any, @Query() query: Record<string, any>) {
    return this.requestsService.getMyLeaveBalance(req.user?.id, query);
  }

  @Get(':id')
  @Permissions('requests.view')
  @ApiOkResponse({ type: RequestResponseDto })
  getRequest(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.getRequest(id, req.user?.id);
  }

  @Get(':id/actions')
  @Permissions('requests.view')
  getActions(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.getActions(id, req.user?.id);
  }

  @Get(':id/history')
  @Permissions('requests.view')
  getApprovalHistory(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.getApprovalHistory(id, req.user?.id);
  }

  @Get(':id/thread')
  @Permissions('requests.view')
  getRequestThread(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.getRequestThread(id, req.user?.id);
  }


  @Post('generate-pdf')
  @Permissions('requests.view')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1001', description: 'Request bigint ID as string' }
      },
      required: ['id']
    }
  })
  generatePdf(@Req() req: any, @Body('id') id: string) {
    return this.requestsService.downloadByAction(id, req.user?.id, { action: 'request_pdf' });
  }

  @Post('generate-pv')
  @Permissions('requests.view')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1001', description: 'Request bigint ID as string' }
      },
      required: ['id']
    }
  })
  generatePaymentVoucher(@Req() req: any, @Body('id') id: string) {
    return this.requestsService.downloadByAction(id, req.user?.id, { action: 'pv_pdf' });
  }

  @Post(':id/download')
  @Permissions('requests.view')
  @ApiOperation({
    summary:
      'Unified download endpoint: request PDF, PV PDF, request+attachments, PV+attachments, full package (download/email)'
  })
  @ApiBody({ type: DownloadRequestDto })
  downloadByAction(@Req() req: any, @Param('id') id: string, @Body() dto: DownloadRequestDto) {
    return this.requestsService.downloadByAction(id, req.user?.id, dto);
  }

  @Post('manual-entry')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Finance manager manual legacy request entry (historical import)' })
  @ApiBody({ type: CreateManualRequestDto })
  createManualEntry(@Req() req: any, @Body() dto: CreateManualRequestDto) {
    return this.requestsService.createManualEntry(req.user?.id, dto);
  }

  @Get('manual-entry/check-number')
  @Permissions('requests.manage')
  checkManualRequestNumber(
    @Query('request_id') requestId?: string,
    @Query('request_type_id') requestTypeId?: string,
    @Query('exclude_id') excludeId?: string
  ) {
    return this.requestsService.checkManualRequestNumber(requestId, requestTypeId, excludeId);
  }

  @Get('manual-entry/check-voucher-number')
  @Permissions('requests.manage')
  checkManualVoucherNumber(
    @Query('voucher_number') voucherNumber?: string,
    @Query('exclude_request_id') excludeRequestId?: string
  ) {
    return this.requestsService.checkManualVoucherNumber(voucherNumber, excludeRequestId);
  }

  @Post(':id/manual-entry')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Update finance manual legacy request entry' })
  @ApiBody({ type: UpdateManualRequestDto })
  updateManualEntry(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateManualRequestDto) {
    return this.requestsService.updateManualEntry(id, req.user?.id, dto);
  }

  @Delete(':id/manual-entry')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Delete finance manual legacy request entry' })
  deleteManualEntry(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.deleteManualEntry(id, req.user?.id);
  }

  private currentUserId(req: any): string | undefined {
    return req?.user?.id ? String(req.user.id) : undefined;
  }


  @Post(':id')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Update draft request' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBody({
    type: UpdateRequestDto,
    examples: {
      default: {
        value: {
          data: { purpose: 'Updated logistics scope', reimbursement: false },
          items: [{ description: 'Diesel purchase', amount: 30000, quantity: 1 }]
        }
      }
    }
  })
  updateRequest(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRequestDto) {
    return this.requestsService.updateRequest(id, req.user?.id, dto);
  }

  @Delete(':id')
  @Permissions('requests.create')
  deleteRequest(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.deleteRequest(id, req.user?.id);
  }

  @Post(':id/retire')
  @Permissions('requests.retire')
  @ApiOperation({ summary: 'Submit retirement by requester after disbursement usage' })
  @ApiBody({
    type: RetireRequestDto,
    examples: {
      default: {
        value: {
          voucher_id: '5e33f8b3-4b80-41de-ae11-cd3657f9300f',
          notes: 'Retirement submitted with all invoice scans.',
          retired_amount: 48000,
          retirement_file_ids: ['f3e8b369-0eca-454f-a8f8-46b780bc6264']
        }
      }
    }
  })
  retire(@Req() req: any, @Param('id') id: string, @Body() dto: RetireRequestDto) {
    return this.requestsService.retire(id, req.user?.id, dto);
  }

  @Post(':id/confirm')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Requester confirms disbursement received' })
  @ApiOkResponse({ type: RequestResponseDto })
  confirmDisbursement(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.confirmDisbursement(id, req.user?.id);
  }

  @Post(':id/payment-vouchers/:voucherId/confirm')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Requester confirms a specific payment voucher disbursement' })
  @ApiOkResponse({ type: RequestResponseDto })
  confirmPaymentVoucher(
    @Req() req: any,
    @Param('id') id: string,
    @Param('voucherId') voucherId: string
  ) {
    return this.requestsService.confirmPaymentVoucher(id, voucherId, req.user?.id);
  }

  @Post(':id/verify-retirement')
  @Permissions('requests.approve')
  @ApiOperation({ summary: 'Finance/accounting verifies retirement and closes request' })
  @ApiOkResponse({ type: RequestResponseDto })
  verifyRetirement(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.verifyRetirement(id, req.user?.id);
  }

  @Post(':id/complete')
  @Permissions('requests.approve')
  @ApiOperation({ summary: 'Alias endpoint for verify-retirement' })
  @ApiOkResponse({ type: RequestResponseDto })
  complete(@Req() req: any, @Param('id') id: string) {
    return this.requestsService.verifyRetirement(id, req.user?.id);
  }
}
