import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { CreatePrDto } from './dto/create-pr.dto';
import { ActionPrDto } from './dto/action-pr.dto';
import { CreatePoDto } from './dto/create-po.dto';
import { ActionPoDto } from './dto/action-po.dto';
import { CreateGrnDto } from './dto/create-grn.dto';
import { ConfirmGrnDto } from './dto/confirm-grn.dto';
import { CreateProcurementCaseDto } from './dto/create-procurement-case.dto';
import { AttachProcurementFileDto } from './dto/attach-procurement-file.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';

@Controller('procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Post('requisitions')
  createPr(@Req() req: any, @Body() dto: CreatePrDto) {
    return this.service.createPr(req.user.id, dto);
  }

  @Post('requisitions/:id/submit')
  submitPr(@Param('id') id: string, @Req() req: any) {
    return this.service.submitPr(id, req.user.id);
  }

  @Post('requisitions/:id/approve')
  approvePr(@Param('id') id: string, @Req() req: any, @Body() dto: ActionPrDto) {
    return this.service.approvePr(id, req.user.id, dto.comment);
  }

  @Post('requisitions/:id/reject')
  rejectPr(@Param('id') id: string, @Req() req: any, @Body() dto: ActionPrDto) {
    return this.service.rejectPr(id, req.user.id, dto.comment);
  }

  @Get('requisitions')
  listPrs(@Req() req: any) {
    return this.service.listPrs(req.user.id, req.user.role);
  }

  @Get('requisitions/:id')
  getPr(@Param('id') id: string) {
    return this.service.getPr(id);
  }

  @Post('requisitions/:id/attachments')
  attachToRequisition(@Param('id') id: string, @Body() dto: AttachProcurementFileDto) {
    return this.service.attachToRequisition(id, dto);
  }

  @Post('orders')
  createPo(@Req() req: any, @Body() dto: CreatePoDto) {
    return this.service.createPo(req.user.id, dto);
  }

  @Post('orders/:id/approve')
  approvePo(@Param('id') id: string, @Req() req: any, @Body() dto: ActionPoDto) {
    return this.service.approvePo(id, req.user.id, dto.comment);
  }

  @Post('orders/:id/reject')
  rejectPo(@Param('id') id: string, @Req() req: any, @Body() dto: ActionPoDto) {
    return this.service.rejectPo(id, req.user.id, dto.comment);
  }

  @Get('orders')
  listPos(@Req() req: any) {
    return this.service.listPos(req.user.id);
  }

  @Get('orders/:id')
  getPo(@Param('id') id: string) {
    return this.service.getPo(id);
  }

  @Post('orders/:id/download')
  downloadPo(@Param('id') id: string, @Req() req: any) {
    return this.service.downloadPo(id, req.user.id);
  }

  @Post('orders/:id/attachments')
  attachToOrder(@Param('id') id: string, @Body() dto: AttachProcurementFileDto) {
    return this.service.attachToOrder(id, dto);
  }

  @Post('grns')
  createGrn(@Req() req: any, @Body() dto: CreateGrnDto) {
    return this.service.createGrn(req.user.id, dto);
  }

  @Post('grns/:id/confirm')
  confirmGrn(@Param('id') id: string, @Req() req: any, @Body() dto: ConfirmGrnDto) {
    return this.service.confirmGrn(id, req.user.id, dto);
  }

  @Get('intake')
  listIntake(@Req() req: any) {
    return this.service.listIntake(req.user.id, req.user.role);
  }

  @Post('intake/:requestId/create-case')
  createCaseFromRequest(@Param('requestId') requestId: string, @Req() req: any, @Body() dto: CreateProcurementCaseDto) {
    return this.service.createCaseFromRequest(requestId, req.user.id, dto);
  }
}
