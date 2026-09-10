import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { FormsService } from './forms.service';
import {
  CreateFormAssignmentDto,
  CreateFormDto,
  CreateFormFieldDto,
  UpdateFormDto,
  UpdateFormFieldDto
} from './dto/manage-forms.dto';

@Controller('forms')
@ApiTags('Forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  list(@Query() query: Record<string, any>) {
    return this.formsService.list(query);
  }

  @Get('manage/list')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  listForManagement(@Query() query: Record<string, any>) {
    return this.formsService.listForManagement(query);
  }

  @Post('manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  create(@Req() req: any, @Body() dto: CreateFormDto) {
    return this.formsService.createForm(req.user?.id, dto);
  }

  @Patch('manage/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.formsService.updateForm(id, dto);
  }

  @Post('manage/:id/fields')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  createField(@Param('id') id: string, @Body() dto: CreateFormFieldDto) {
    return this.formsService.createField(id, dto);
  }

  @Patch('manage/:id/fields/:fieldId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  updateField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Body() dto: UpdateFormFieldDto) {
    return this.formsService.updateField(id, fieldId, dto);
  }

  @Delete('manage/:id/fields/:fieldId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  deleteField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    return this.formsService.deleteField(id, fieldId);
  }

  @Get('manage/assignments/list')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  listAssignments(@Query() query: Record<string, any>) {
    return this.formsService.listAssignments(query);
  }

  @Post('manage/assignments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  assignForm(@Body() dto: CreateFormAssignmentDto) {
    return this.formsService.createAssignment(dto);
  }

  @Delete('manage/assignments/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth('bearer')
  deleteAssignment(@Param('id') id: string) {
    return this.formsService.deleteAssignment(id);
  }

  @Get(':id')
  getForm(@Param('id') id: string) {
    return this.formsService.getFormById(id);
  }
}
