import { Module } from '@nestjs/common';
import { DbModule } from '$common/db/db.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [DbModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService]
})
export class OnboardingModule {}
