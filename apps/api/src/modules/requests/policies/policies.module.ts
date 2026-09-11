import { Module } from '@nestjs/common';
import { DrizzleModule } from '$common/drizzle/drizzle.module';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

@Module({
  imports: [DrizzleModule],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService]
})
export class PoliciesModule {}
