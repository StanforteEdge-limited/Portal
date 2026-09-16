import { Module } from '@nestjs/common';
import { CrmActivitiesController } from './activities.controller';
import { CrmActivitiesService } from './activities.service';

@Module({
  controllers: [CrmActivitiesController],
  providers: [CrmActivitiesService],
})
export class CrmActivitiesModule {}
