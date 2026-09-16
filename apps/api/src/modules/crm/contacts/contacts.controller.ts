import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CrmContactsService } from './contacts.service';
import { UpsertCrmContactDto } from './dto/upsert-contact.dto';

@Controller('crm/contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM Contacts')
@ApiBearerAuth('bearer')
export class CrmContactsController {
  constructor(private readonly contactsService: CrmContactsService) {}

  @Get()
  @Permissions('users.view')
  list(@Query() query: Record<string, any>) {
    return this.contactsService.listContacts(query);
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: UpsertCrmContactDto) {
    return this.contactsService.createContact(dto);
  }

  @Get(':id')
  @Permissions('users.view')
  get(@Param('id') id: string) {
    return this.contactsService.getContact(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpsertCrmContactDto) {
    return this.contactsService.updateContact(id, dto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  delete(@Param('id') id: string) {
    return this.contactsService.deleteContact(id);
  }
}
