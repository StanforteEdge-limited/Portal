import { Module } from '@nestjs/common';
import { CrmLeadsController } from './leads.controller';
import { CrmLeadsService } from './leads.service';

@Module({
  controllers: [CrmLeadsController],
  providers: [CrmLeadsService],
})
export class CrmLeadsModule {}
