import { Module } from '@nestjs/common';
import { CrmContactsController } from './contacts.controller';
import { CrmContactsService } from './contacts.service';

@Module({
  controllers: [CrmContactsController],
  providers: [CrmContactsService],
})
export class CrmContactsModule {}
