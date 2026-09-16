import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CrmAccountsService } from './accounts.service';
import { UpsertCrmAccountDto } from './dto/upsert-account.dto';

@Controller('crm/accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('CRM Accounts')
@ApiBearerAuth('bearer')
export class CrmAccountsController {
  constructor(private readonly accountsService: CrmAccountsService) {}

  @Get()
  @Permissions('users.view')
  list(@Query() query: Record<string, any>) {
    return this.accountsService.listAccounts(query);
  }

  @Post()
  @Permissions('users.manage')
  create(@Body() dto: UpsertCrmAccountDto) {
    return this.accountsService.createAccount(dto);
  }

  @Get(':id')
  @Permissions('users.view')
  get(@Param('id') id: string) {
    return this.accountsService.getAccount(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  update(@Param('id') id: string, @Body() dto: UpsertCrmAccountDto) {
    return this.accountsService.updateAccount(id, dto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  delete(@Param('id') id: string) {
    return this.accountsService.deleteAccount(id);
  }
}
