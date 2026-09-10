import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { AcknowledgeDocumentDto } from './dto/acknowledge-document.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Documents')
@ApiBearerAuth('bearer')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Req() req: any, @Query() query: Record<string, any>) {
    return this.documentsService.list(req.user?.id, query);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.get(req.user?.id, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateDocumentDto) {
    const userPerms = req.user?.permissions ?? [];
    const isHrOrAdmin = userPerms.includes('*') || userPerms.includes('hr.manage') || userPerms.includes('settings.manage');
    if ((dto.require_acknowledgement || dto.category?.toLowerCase() === 'policy') && !isHrOrAdmin) {
      throw new ForbiddenException('Only HR and Administrators can require document acknowledgements or create official policies.');
    }
    return this.documentsService.create(dto, req.user?.id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    const userPerms = req.user?.permissions ?? [];
    const isHrOrAdmin = userPerms.includes('*') || userPerms.includes('hr.manage') || userPerms.includes('settings.manage');
    if ((dto.require_acknowledgement || dto.category?.toLowerCase() === 'policy') && !isHrOrAdmin) {
      throw new ForbiddenException('Only HR and Administrators can require document acknowledgements or create official policies.');
    }
    return this.documentsService.update(id, dto, req.user?.id);
  }

  @Post(':id/acknowledge')
  acknowledge(@Req() req: any, @Param('id') id: string, @Body() dto: AcknowledgeDocumentDto) {
    return this.documentsService.acknowledge(id, req.user?.id, req, dto);
  }

  @Get(':id/acknowledgements')
  @Permissions('users.manage')
  listAcknowledgements(@Param('id') id: string, @Query() query: Record<string, any>) {
    return this.documentsService.listAcknowledgements(id, query);
  }
}
