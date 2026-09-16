import { Module } from '@nestjs/common';
import { CrmPipelinesController } from './pipelines.controller';
import { CrmPipelinesService } from './pipelines.service';

@Module({
  controllers: [CrmPipelinesController],
  providers: [CrmPipelinesService],
})
export class CrmPipelinesModule {}
