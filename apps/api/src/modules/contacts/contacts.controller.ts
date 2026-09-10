import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

@Controller('contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Contacts')
@ApiBearerAuth('bearer')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Permissions('users.manage')
  list(@Query() query: Record<string, any>) {
    return this.contactsService.list(query);
  }

  @Get(':id')
  @Permissions('users.manage')
  get(@Param('id') id: string) {
    return this.contactsService.get(id);
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Post(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }
}
