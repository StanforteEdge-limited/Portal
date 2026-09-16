import { Module } from '@nestjs/common';
import { CrmAccountsController } from './accounts.controller';
import { CrmAccountsService } from './accounts.service';

@Module({
  controllers: [CrmAccountsController],
  providers: [CrmAccountsService],
})
export class CrmAccountsModule {}
