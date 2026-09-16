import { Module } from '@nestjs/common';
import { CrmOpportunitiesController } from './opportunities.controller';
import { CrmOpportunitiesService } from './opportunities.service';

@Module({
  controllers: [CrmOpportunitiesController],
  providers: [CrmOpportunitiesService],
})
export class CrmOpportunitiesModule {}
