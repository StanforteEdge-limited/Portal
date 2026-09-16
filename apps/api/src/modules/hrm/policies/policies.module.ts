import { Module } from '@nestjs/common';
import { DbModule } from '$common/db/db.module';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

@Module({
  imports: [DbModule],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService]
})
export class PoliciesModule {}
